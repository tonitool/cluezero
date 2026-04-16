import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { loadAliasMap } from '@/lib/brand-aliases'

export const dynamic = 'force-dynamic'

type Period = 'week' | 'month' | 'year'

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

/** Returns the grouping key for a week_start date based on the selected period */
function periodKey(dateStr: string, period: Period): string {
  if (period === 'week') return dateStr // already YYYY-MM-DD
  if (period === 'month') return dateStr.slice(0, 7) // YYYY-MM
  return dateStr.slice(0, 4) // YYYY
}

/** Human-readable label for a period bucket */
function formatPeriod(key: string, period: Period): string {
  if (period === 'year') return key
  if (period === 'month') {
    const d = new Date(key + '-01')
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }
  // week: key is YYYY-MM-DD
  const d = new Date(key)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

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
  const fromParam = searchParams.get('from') // ISO date YYYY-MM-DD
  const toParam = searchParams.get('to')     // ISO date YYYY-MM-DD
  const period = (searchParams.get('period') ?? 'week') as Period
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
  adsQuery = adsQuery.limit(50000)
  const { data: rows, error } = await adsQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ hasData: false })

  const aliasMap = await loadAliasMap(workspaceId)

  // Aggregate raw data per brand × week (raw week_start values)
  const byBrandWeek: Record<string, Record<string, BWData>> = {}
  const allWeeks = new Set<string>()
  const brandNames: Record<string, string> = {}

  for (const ad of rows) {
    const rawName = ((ad.tracked_brands as unknown) as { name: string } | null)?.name ?? 'Unknown'
    const resolvedName = aliasMap.resolve(rawName)
    if (!resolvedName) continue // excluded brand
    const key = brandKey(resolvedName)
    brandNames[key] = resolvedName
    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []

    const weeks = estimates.length > 0
      ? estimates.map((e: { week_start: string; est_spend_eur: number | null; est_reach: number | null }) => ({
          week: e.week_start, spend: Number(e.est_spend_eur ?? 0), reach: Number(e.est_reach ?? 0)
        }))
      : [{ week: getWeekStart(ad.first_seen_at), spend: 0, reach: 0 }]

    for (const { week, spend, reach } of weeks) {
      // Filter by date range if provided
      if (fromParam && week < fromParam) continue
      if (toParam && week > toParam) continue

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

  // Group weeks into period buckets (week/month/year)
  const periodBuckets = [...new Set(sortedWeeks.map(w => periodKey(w, period)))].sort()
  const latestBucket = periodBuckets[periodBuckets.length - 1]
  const prevBucket = periodBuckets[periodBuckets.length - 2] ?? null

  // Helper: aggregate BWData across all raw weeks that fall into a given period bucket
  function aggregateForBucket(bKey: string, bucket: string): BWData {
    const result: BWData = { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
    for (const week of sortedWeeks) {
      if (periodKey(week, period) !== bucket) continue
      const w = byBrandWeek[bKey]?.[week]
      if (!w) continue
      result.totalAds += w.totalAds
      result.newAds += w.newAds
      result.spend += w.spend
      result.reach += w.reach
      result.piScores.push(...w.piScores)
    }
    return result
  }

  // Helper: aggregate BWData across ALL buckets in range (for KPIs)
  function aggregateAll(bKey: string): BWData {
    const result: BWData = { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
    for (const week of sortedWeeks) {
      const w = byBrandWeek[bKey]?.[week]
      if (!w) continue
      result.totalAds += w.totalAds
      result.newAds += w.newAds
      result.spend += w.spend
      result.reach += w.reach
      result.piScores.push(...w.piScores)
    }
    return result
  }

  const ownKey = brands.find(b => b === ownBrandParam)
    ?? brands.find(b => b.includes(ownBrandParam) || ownBrandParam.includes(b))
    ?? brands[0]
    ?? ''

  const periodLabel = period === 'year' ? 'yearly' : period === 'month' ? 'monthly' : 'weekly'

  // Trend charts: grouped by period buckets
  const weeklySpendMovement = periodBuckets.map(bucket => {
    const row: Record<string, unknown> = { week: formatPeriod(bucket, period) }
    for (const b of brands) row[b] = Math.round(aggregateForBucket(b, bucket).spend)
    return row
  })

  const spendShareTrend = periodBuckets.map(bucket => {
    const total = brands.reduce((s, b) => s + aggregateForBucket(b, bucket).spend, 0)
    const row: Record<string, unknown> = { week: formatPeriod(bucket, period) }
    for (const b of brands) {
      row[b] = total > 0 ? Math.round((aggregateForBucket(b, bucket).spend / total) * 100) : 0
    }
    return row
  })

  const newAdsTrend = periodBuckets.map(bucket => {
    const row: Record<string, unknown> = { week: formatPeriod(bucket, period) }
    for (const b of brands) row[b] = aggregateForBucket(b, bucket).newAds
    return row
  })

  const newVsExistingByAdvertiser = brands.map(b => {
    const agg = aggregateAll(b)
    const total = agg.totalAds
    return {
      advertiser: brandNames[b] ?? b,
      newAdsPct: total > 0 ? Math.round((agg.newAds / total) * 100) : 0,
      existingAdsPct: total > 0 ? Math.round(((total - agg.newAds) / total) * 100) : 0,
    }
  })

  const performanceTrend = periodBuckets.map(bucket => {
    const ownAgg = aggregateForBucket(ownKey, bucket)
    const ownAvg = ownAgg.piScores.length > 0
      ? Math.round(ownAgg.piScores.reduce((s, v) => s + v, 0) / ownAgg.piScores.length * 10) / 10 : null
    const allPis = brands.flatMap(b => aggregateForBucket(b, bucket).piScores)
    const marketAvg = allPis.length > 0
      ? Math.round(allPis.reduce((s, v) => s + v, 0) / allPis.length * 10) / 10 : null
    return { week: formatPeriod(bucket, period), ownBrand: ownAvg, market: marketAvg }
  })

  // Table: aggregate across the FULL selected range (not just latest period)
  const table = brands.map(b => {
    const agg = aggregateAll(b)
    const avgPi = agg.piScores.length > 0
      ? Math.round(agg.piScores.reduce((s, v) => s + v, 0) / agg.piScores.length * 10) / 10 : null
    return { advertiser: brandNames[b] ?? b, platform: 'META', totalAds: agg.totalAds, newAds: agg.newAds, weeklyReach: agg.reach, weeklySpend: Math.round(agg.spend), avgPi }
  })

  const ownBrandLabel = brandNames[ownKey] ?? ownKey.toUpperCase()

  // KPIs: aggregate across FULL selected range
  const totalSpend = brands.reduce((s, b) => s + aggregateAll(b).spend, 0)
  const totalReach = brands.reduce((s, b) => s + aggregateAll(b).reach, 0)
  const totalNewAds = brands.reduce((s, b) => s + aggregateAll(b).newAds, 0)
  const ownAgg = aggregateAll(ownKey)
  const ownShare = totalSpend > 0 ? (ownAgg.spend / totalSpend * 100).toFixed(1) : '0'

  // Delta: compare latest period bucket vs previous
  const latestBucketSpend = latestBucket ? brands.reduce((s, b) => s + aggregateForBucket(b, latestBucket).spend, 0) : 0
  const prevBucketSpend = prevBucket ? brands.reduce((s, b) => s + aggregateForBucket(b, prevBucket).spend, 0) : 0
  const spendDelta = prevBucketSpend > 0 ? ((latestBucketSpend - prevBucketSpend) / prevBucketSpend * 100).toFixed(1) : null
  const latestBucketNewAds = latestBucket ? brands.reduce((s, b) => s + aggregateForBucket(b, latestBucket).newAds, 0) : 0
  const prevBucketNewAds = prevBucket ? brands.reduce((s, b) => s + aggregateForBucket(b, prevBucket).newAds, 0) : 0
  const newAdsDelta = prevBucketNewAds > 0 ? ((latestBucketNewAds - prevBucketNewAds) / prevBucketNewAds * 100).toFixed(1) : null
  const prevVsLabel = `vs previous ${period}`

  const executiveMetrics = [
    { label: `Total est. market spend`, value: `€${Math.round(totalSpend).toLocaleString()}`, delta: spendDelta != null ? `${Number(spendDelta) >= 0 ? '+' : ''}${spendDelta}% ${prevVsLabel}` : '—', direction: spendDelta != null && Number(spendDelta) >= 0 ? 'up' : 'down', info: 'Total estimated ad spend across all tracked competitors. Shows how much the market is investing in paid media.' },
    { label: `% ${ownBrandLabel} share of est. spend`, value: `${ownShare}%`, delta: '—', direction: 'up', info: 'Your brand\'s share of the total market ad spend. Higher share = more visibility vs competitors.' },
    { label: `New ads (market)`, value: String(totalNewAds), delta: newAdsDelta != null ? `${Number(newAdsDelta) >= 0 ? '+' : ''}${newAdsDelta}% ${prevVsLabel}` : '—', direction: newAdsDelta != null && Number(newAdsDelta) >= 0 ? 'up' : 'down', info: 'Total new ads launched across all competitors. Rising count signals increased market activity.' },
    { label: `${ownBrandLabel} new ads`, value: String(ownAgg.newAds), delta: '—', direction: 'up', info: 'New ads launched by your brand in the selected period. Compare with market total to gauge your creative output.' },
  ]

  const spendFromNew = brands.reduce((s, b) => {
    const agg = aggregateAll(b)
    return s + agg.spend * (agg.totalAds > 0 ? agg.newAds / agg.totalAds : 0)
  }, 0)
  const spendFromExisting = totalSpend - spendFromNew

  const weeklyMovementMetrics = [
    { label: `Total market est. reach`, value: Math.round(totalReach).toLocaleString(), subtitle: 'estimated impressions', delta: '—', direction: 'up', info: 'Estimated total audience reached by all tracked ads. Indicates overall market visibility.' },
    { label: `Total market est. spend`, value: `€${Math.round(totalSpend).toLocaleString()}`, subtitle: 'across active advertisers', delta: spendDelta != null ? `${Number(spendDelta) >= 0 ? '+' : ''}${spendDelta}%` : '—', direction: spendDelta != null && Number(spendDelta) >= 0 ? 'up' : 'down', info: 'Combined estimated ad spend for all tracked brands in the selected period.' },
    { label: 'From new ads', value: `€${Math.round(spendFromNew).toLocaleString()}`, subtitle: `${totalSpend > 0 ? (spendFromNew / totalSpend * 100).toFixed(1) : '0'}% of movement`, delta: '—', direction: 'down', info: 'Spend allocated to newly launched creatives. High ratio = market is actively pushing fresh content.' },
    { label: 'From existing ads', value: `€${Math.round(spendFromExisting).toLocaleString()}`, subtitle: `${totalSpend > 0 ? (spendFromExisting / totalSpend * 100).toFixed(1) : '0'}% of movement`, delta: '—', direction: 'up', info: 'Spend on ads that were already running. High ratio = competitors are scaling proven creatives.' },
  ]

  return NextResponse.json({ hasData: true, executiveMetrics, weeklySpendMovement, spendShareTrend, weeklyMovementMetrics, newVsExistingByAdvertiser, newAdsTrend, performanceTrend, table, brands, brandNames, ownBrandLabel })
}
