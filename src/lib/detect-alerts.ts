import { createClient as createAdminClient } from '@supabase/supabase-js'

function brandKey(name: string): string {
  const n = name.toLowerCase().replace(/[\s\-_]/g, '')
  if (n.includes('orlen')) return 'orlen'
  if (n.includes('aral')) return 'aral'
  if (n.includes('circlek') || n.includes('circle')) return 'circleK'
  if (n === 'eni' || n.startsWith('eni')) return 'eni'
  if (n.includes('esso')) return 'esso'
  if (n.includes('shell')) return 'shell'
  return n
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

const DEFAULT_RULES = [
  { name: 'Competitor Spend Spike', condition_type: 'spend_spike',    threshold: 25 },
  { name: 'New Ad Burst',           condition_type: 'new_ad_burst',   threshold: 5  },
  { name: 'High-PI New Creative',   condition_type: 'high_pi_new_ad', threshold: 70 },
  { name: 'Own Brand Share Drop',   condition_type: 'share_drop',     threshold: 10 },
]

export async function detectAlerts(workspaceId: string): Promise<void> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ensure default rules exist — only insert if none exist yet
  const { data: existingRules } = await admin
    .from('alert_rules')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)

  if (!existingRules || existingRules.length === 0) {
    await admin.from('alert_rules').insert(
      DEFAULT_RULES.map(r => ({ ...r, workspace_id: workspaceId }))
    )
  }

  // Load enabled rules
  const { data: rules } = await admin
    .from('alert_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)

  if (!rules || rules.length === 0) return

  // Load ads with tracked_brands and spend estimates
  const { data: ads } = await admin
    .from('ads')
    .select(`
      id,
      first_seen_at,
      performance_index,
      headline,
      tracked_brands ( name, is_own_brand ),
      ad_spend_estimates ( week_start, est_spend_eur )
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  if (!ads || ads.length === 0) return

  // Collect all week starts
  const allWeekStarts = new Set<string>()
  for (const ad of ads) {
    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []
    for (const est of estimates) {
      if (est.week_start) allWeekStarts.add(est.week_start)
    }
  }

  const sortedWeeks = [...allWeekStarts].sort()
  const latestWeek = sortedWeeks[sortedWeeks.length - 1]
  const prevWeek = sortedWeeks[sortedWeeks.length - 2]

  if (!latestWeek) return

  // Aggregate per brand
  type BrandStats = {
    name: string
    isOwn: boolean
    latestSpend: number
    prevSpend: number
    newAdsCount: number
    maxPiNewAd: number | null
  }

  const byBrand: Record<string, BrandStats> = {}

  for (const ad of ads) {
    const tb = ad.tracked_brands as unknown as { name: string; is_own_brand: boolean } | null
    if (!tb) continue
    const key = brandKey(tb.name)
    if (!byBrand[key]) {
      byBrand[key] = {
        name: tb.name,
        isOwn: tb.is_own_brand ?? false,
        latestSpend: 0,
        prevSpend: 0,
        newAdsCount: 0,
        maxPiNewAd: null,
      }
    }

    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []
    for (const est of estimates) {
      if (est.week_start === latestWeek) byBrand[key].latestSpend += Number(est.est_spend_eur ?? 0)
      if (prevWeek && est.week_start === prevWeek) byBrand[key].prevSpend += Number(est.est_spend_eur ?? 0)
    }

    // New ads in latest week
    const adWeek = getWeekStart(ad.first_seen_at)
    if (adWeek === latestWeek) {
      byBrand[key].newAdsCount++
      if (ad.performance_index != null) {
        const pi = Number(ad.performance_index)
        if (byBrand[key].maxPiNewAd == null || pi > byBrand[key].maxPiNewAd!) {
          byBrand[key].maxPiNewAd = pi
        }
      }
    }
  }

  const totalLatestSpend = Object.values(byBrand).reduce((s, b) => s + b.latestSpend, 0)
  const ownBrand = Object.values(byBrand).find(b => b.isOwn)

  // Evaluate each rule
  for (const rule of rules) {
    const triggered: { message: string; severity: string }[] = []

    switch (rule.condition_type) {
      case 'spend_spike': {
        for (const b of Object.values(byBrand)) {
          if (b.isOwn) continue
          if (b.latestSpend > 0 && b.prevSpend > 0) {
            const changePct = ((b.latestSpend - b.prevSpend) / b.prevSpend) * 100
            if (changePct >= rule.threshold) {
              triggered.push({
                message: `${b.name} spend spiked +${changePct.toFixed(1)}% WoW (€${Math.round(b.prevSpend).toLocaleString()} → €${Math.round(b.latestSpend).toLocaleString()})`,
                severity: 'warning',
              })
            }
          }
        }
        break
      }

      case 'new_ad_burst': {
        for (const b of Object.values(byBrand)) {
          if (b.newAdsCount >= rule.threshold) {
            triggered.push({
              message: `${b.name} launched ${b.newAdsCount} new ads in week of ${latestWeek}`,
              severity: 'info',
            })
          }
        }
        break
      }

      case 'high_pi_new_ad': {
        for (const b of Object.values(byBrand)) {
          if (b.maxPiNewAd != null && b.maxPiNewAd >= rule.threshold) {
            triggered.push({
              message: `New creative by ${b.name} has PI ${b.maxPiNewAd} (above threshold ${rule.threshold})`,
              severity: 'info',
            })
          }
        }
        break
      }

      case 'share_drop': {
        if (ownBrand && totalLatestSpend > 0) {
          const share = (ownBrand.latestSpend / totalLatestSpend) * 100
          if (share < rule.threshold) {
            triggered.push({
              message: `${ownBrand.name} share of voice dropped to ${share.toFixed(1)}% (below threshold ${rule.threshold}%)`,
              severity: 'warning',
            })
          }
        }
        break
      }
    }

    for (const t of triggered) {
      await admin.from('alert_events').insert({
        workspace_id: workspaceId,
        rule_id:      rule.id,
        rule_name:    rule.name,
        message:      t.message,
        severity:     t.severity,
      })

      await admin
        .from('alert_rules')
        .update({
          trigger_count:      rule.trigger_count + 1,
          last_triggered_at:  new Date().toISOString(),
        })
        .eq('id', rule.id)
    }
  }
}
