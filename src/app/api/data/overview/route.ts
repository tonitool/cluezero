import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function brandKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]/g, '')
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/**
 * An ad is "new" in the period containing `periodDate` if `first_seen_at`
 * falls in the same calendar month.
 *
 * Why month comparison? Snowflake's V_AD_LIBRARY_FINAL_WEEKLY uses
 * DATE_TRUNC('MONTH', sync_week) so every row's date is the 1st of a month.
 * An ad's first appearance is therefore a month boundary, not a specific week.
 * Comparing by 7-day window would only flag the very first week as "new" and
 * misclassify all subsequent weeks of that same first month.
 */
function isNewAd(firstSeenAt: string, periodDate: string): boolean {
  const first = new Date(firstSeenAt)
  const period = new Date(periodDate)
  return (
    first.getUTCFullYear() === period.getUTCFullYear() &&
    first.getUTCMonth()    === period.getUTCMonth()
  )
}

type BWData = { totalAds: number; newAds: number; spend: number; reach: number; piScores: number[] }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const connectionId = searchParams.get('connectionId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: membership } = await admin
    .from('workspace_members').select('id')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Resolve own brand from workspace config (generic, not client-specific)
  const { data: ws } = await admin.from('workspaces').select('own_brand').eq('id', workspaceId).single()
  const ownBrandParam = (ws?.own_brand ?? '').toLowerCase().replace(/[\s\-_]/g, '')

  let adsQuery = admin
    .from('ads')
    .select(`id, first_seen_at, performance_index,
      tracked_brands ( name ),
      ad_spend_estimates ( week_start, est_spend_eur, est_reach )`)
    .eq('workspace_id', workspaceId)
  if (connectionId) adsQuery = adsQuery.eq('connection_id', connectionId)
  const { data: rows, error } = await adsQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ hasData: false })

  const byBrandWeek: Record<string, Record<string, BWData>> = {}
  const allWeeks = new Set<string>()
  const brandNames: Record<string, string> = {}

  for (const ad of rows) {
    const rawName = ((ad.tracked_brands as unknown) as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    brandNames[key] = rawName
    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []

    const weeks = estimates.length > 0
      ? estimates.map((e: { week_start: string; est_spend_eur: number | null; est_reach: number | null }) => ({
          week: e.week_start, spend: Number(e.est_spend_eur ?? 0), reach: Number(e.est_reach ?? 0)
        }))
      : [{ week: getWeekStart(ad.first_seen_at), spend: 0, reach: 0 }]

    for (const { week, spend, reach } of weeks) {
      allWeeks.add(week)
      if (!byBrandWeek[key]) byBrandWeek[key] = {}
      if (!byBrandWeek[key][week]) byBrandWeek[key][week] = { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
      byBrandWeek[key][week].totalAds++
      if (isNewAd(ad.first_seen_at, week)) byBrandWeek[key][week].newAds++
      byBrandWeek[key][week].spend += spend
      byBrandWeek[key][week].reach += reach
      if (ad.performance_index != null) byBrandWeek[key][week].piScores.push(Number(ad.performance_index))
    }
  }

  const sortedWeeks = [...allWeeks].sort()
  const brands = Object.keys(byBrandWeek)
  const latestWeek = sortedWeeks[sortedWeeks.length - 1]
  const prevWeek = sortedWeeks[sortedWeeks.length - 2] ?? null

  // Must be defined before performanceTrend which references it
  // Exact match first (workspace own_brand now stores exact brand name from dropdown),
  // then fuzzy, then fall back to first brand alphabetically
  const ownKey = brands.find(b => b === ownBrandParam)
    ?? brands.find(b => b.includes(ownBrandParam) || ownBrandParam.includes(b))
    ?? brands[0]
    ?? ''

  const weeklySpendMovement = sortedWeeks.map(week => {
    const row: Record<string, unknown> = { week: formatWeek(week) }
    for (const b of brands) row[b] = Math.round(byBrandWeek[b]?.[week]?.spend ?? 0)
    return row
  })

  const spendShareTrend = sortedWeeks.map(week => {
    const total = brands.reduce((s, b) => s + (byBrandWeek[b]?.[week]?.spend ?? 0), 0)
    const row: Record<string, unknown> = { week: formatWeek(week) }
    for (const b of brands) {
      row[b] = total > 0 ? Math.round(((byBrandWeek[b]?.[week]?.spend ?? 0) / total) * 100) : 0
    }
    return row
  })

  const newAdsTrend = sortedWeeks.map(week => {
    const row: Record<string, unknown> = { week: formatWeek(week) }
    for (const b of brands) row[b] = byBrandWeek[b]?.[week]?.newAds ?? 0
    return row
  })

  const newVsExistingByAdvertiser = brands.map(b => {
    let totalNew = 0, totalExisting = 0
    for (const week of sortedWeeks) {
      const w = byBrandWeek[b]?.[week]
      if (w) { totalNew += w.newAds; totalExisting += w.totalAds - w.newAds }
    }
    const total = totalNew + totalExisting
    return {
      advertiser: brandNames[b] ?? b,
      newAdsPct: total > 0 ? Math.round((totalNew / total) * 100) : 0,
      existingAdsPct: total > 0 ? Math.round((totalExisting / total) * 100) : 0,
    }
  })

  const performanceTrend = sortedWeeks.map(week => {
    const orlenPis = byBrandWeek[ownKey]?.[week]?.piScores ?? []
    const orlenAvg = orlenPis.length > 0
      ? Math.round(orlenPis.reduce((s, v) => s + v, 0) / orlenPis.length * 10) / 10 : null
    const allPis = brands.flatMap(b => byBrandWeek[b]?.[week]?.piScores ?? [])
    const marketAvg = allPis.length > 0
      ? Math.round(allPis.reduce((s, v) => s + v, 0) / allPis.length * 10) / 10 : null
    return { week: formatWeek(week), orlen: orlenAvg, market: marketAvg }
  })

  const table = brands.map(b => {
    const w = byBrandWeek[b]?.[latestWeek] ?? { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
    const avgPi = w.piScores.length > 0
      ? Math.round(w.piScores.reduce((s, v) => s + v, 0) / w.piScores.length * 10) / 10 : null
    return { advertiser: brandNames[b] ?? b, platform: 'META', totalAds: w.totalAds, newAds: w.newAds, weeklyReach: w.reach, weeklySpend: Math.round(w.spend), avgPi }
  })

  const ownBrandLabel = brandNames[ownKey] ?? ownKey.toUpperCase()

  const latestTotalSpend = brands.reduce((s, b) => s + (byBrandWeek[b]?.[latestWeek]?.spend ?? 0), 0)
  const prevTotalSpend = prevWeek ? brands.reduce((s, b) => s + (byBrandWeek[b]?.[prevWeek]?.spend ?? 0), 0) : null
  const spendDelta = prevTotalSpend && prevTotalSpend > 0 ? ((latestTotalSpend - prevTotalSpend) / prevTotalSpend * 100).toFixed(1) : null
  const ownSpend = byBrandWeek[ownKey]?.[latestWeek]?.spend ?? 0
  const ownShare = latestTotalSpend > 0 ? (ownSpend / latestTotalSpend * 100).toFixed(1) : '0'
  const latestTotalNewAds = brands.reduce((s, b) => s + (byBrandWeek[b]?.[latestWeek]?.newAds ?? 0), 0)
  const prevTotalNewAds = prevWeek ? brands.reduce((s, b) => s + (byBrandWeek[b]?.[prevWeek]?.newAds ?? 0), 0) : null
  const newAdsDelta = prevTotalNewAds && prevTotalNewAds > 0 ? ((latestTotalNewAds - prevTotalNewAds) / prevTotalNewAds * 100).toFixed(1) : null
  const ownNewAds = byBrandWeek[ownKey]?.[latestWeek]?.newAds ?? 0
  const prevOwnNewAds = prevWeek ? (byBrandWeek[ownKey]?.[prevWeek]?.newAds ?? 0) : null
  const ownNewAdsDelta = prevOwnNewAds != null && prevOwnNewAds > 0 ? ((ownNewAds - prevOwnNewAds) / prevOwnNewAds * 100).toFixed(1) : null

  const executiveMetrics = [
    { label: 'Weekly est. market spend', value: `€${Math.round(latestTotalSpend).toLocaleString()}`, delta: spendDelta != null ? `${Number(spendDelta) >= 0 ? '+' : ''}${spendDelta}% vs previous week` : '—', direction: spendDelta != null && Number(spendDelta) >= 0 ? 'up' : 'down' },
    { label: `% ${ownBrandLabel} share of weekly est. spend`, value: `${ownShare}%`, delta: '—', direction: 'up' },
    { label: 'New ads this week (market)', value: String(latestTotalNewAds), delta: newAdsDelta != null ? `${Number(newAdsDelta) >= 0 ? '+' : ''}${newAdsDelta}% vs previous week` : '—', direction: newAdsDelta != null && Number(newAdsDelta) >= 0 ? 'up' : 'down' },
    { label: `${ownBrandLabel} new ads`, value: String(ownNewAds), delta: ownNewAdsDelta != null ? `${Number(ownNewAdsDelta) >= 0 ? '+' : ''}${ownNewAdsDelta}% vs previous week` : '—', direction: ownNewAdsDelta != null && Number(ownNewAdsDelta) >= 0 ? 'up' : 'down' },
  ]

  const latestTotalReach = brands.reduce((s, b) => s + (byBrandWeek[b]?.[latestWeek]?.reach ?? 0), 0)
  const latestSpendFromNew = brands.reduce((s, b) => {
    const w = byBrandWeek[b]?.[latestWeek]
    if (!w) return s
    return s + w.spend * (w.totalAds > 0 ? w.newAds / w.totalAds : 0)
  }, 0)
  const latestSpendFromExisting = latestTotalSpend - latestSpendFromNew

  const weeklyMovementMetrics = [
    { label: 'Total market weekly est. reach', value: Math.round(latestTotalReach).toLocaleString(), subtitle: 'estimated impressions', delta: '—', direction: 'up' },
    { label: 'Total market weekly est. spend', value: `€${Math.round(latestTotalSpend).toLocaleString()}`, subtitle: 'across active advertisers', delta: spendDelta != null ? `${Number(spendDelta) >= 0 ? '+' : ''}${spendDelta}%` : '—', direction: spendDelta != null && Number(spendDelta) >= 0 ? 'up' : 'down' },
    { label: 'From new ads', value: `€${Math.round(latestSpendFromNew).toLocaleString()}`, subtitle: `${latestTotalSpend > 0 ? (latestSpendFromNew / latestTotalSpend * 100).toFixed(1) : '0'}% of weekly movement`, delta: '—', direction: 'down' },
    { label: 'From existing ads', value: `€${Math.round(latestSpendFromExisting).toLocaleString()}`, subtitle: `${latestTotalSpend > 0 ? (latestSpendFromExisting / latestTotalSpend * 100).toFixed(1) : '0'}% of weekly movement`, delta: '—', direction: 'up' },
  ]

  return NextResponse.json({ hasData: true, executiveMetrics, weeklySpendMovement, spendShareTrend, weeklyMovementMetrics, newVsExistingByAdvertiser, newAdsTrend, performanceTrend, table, brands, brandNames })
}
