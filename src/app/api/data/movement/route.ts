import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Period = 'week' | 'month' | 'year'

function periodKeyFn(dateStr: string, period: Period): string {
  if (period === 'week') return dateStr
  if (period === 'month') return dateStr.slice(0, 7)
  return dateStr.slice(0, 4)
}

function formatPeriod(key: string, period: Period): string {
  if (period === 'year') return key
  if (period === 'month') {
    const d = new Date(key + '-01')
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }
  const d = new Date(key)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const connectionId = searchParams.get('connectionId')
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const period = (searchParams.get('period') ?? 'week') as Period

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Load own_brand for PI trend labeling
  const { data: ws } = await admin
    .from('workspaces')
    .select('own_brand')
    .eq('id', workspaceId)
    .single()
  const ownBrand = (ws?.own_brand ?? '').toLowerCase().replace(/[\s\-_]/g, '')

  // Query ads + spend estimates + brand names directly (bypass weekly_metrics)
  let adsQuery = admin
    .from('ads')
    .select(`
      id,
      first_seen_at,
      is_active,
      performance_index,
      tracked_brands ( name ),
      ad_spend_estimates ( week_start, est_spend_eur, est_reach, est_impressions )
    `)
    .eq('workspace_id', workspaceId)
  if (connectionId) adsQuery = adsQuery.eq('connection_id', connectionId)
  adsQuery = adsQuery.limit(50000)
  const { data: rows, error } = await adsQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ hasData: false, metrics: [] })

  // Aggregate per brand + week
  type BrandWeek = {
    totalAds: number
    newAds: number
    spend: number
    reach: number
    piScores: number[]
  }

  const byBrandWeek: Record<string, Record<string, BrandWeek>> = {}
  const allWeeks = new Set<string>()

  for (const ad of rows) {
    const brand = ((ad.tracked_brands as unknown) as { name: string } | null)?.name ?? 'Unknown'
    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []

    if (estimates.length === 0) {
      const week = getWeekStart(ad.first_seen_at)
      if (fromParam && week < fromParam) continue
      if (toParam && week > toParam) continue
      allWeeks.add(week)
      if (!byBrandWeek[brand]) byBrandWeek[brand] = {}
      if (!byBrandWeek[brand][week]) byBrandWeek[brand][week] = { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
      byBrandWeek[brand][week].totalAds++
      if (isNewAd(ad.first_seen_at, week)) byBrandWeek[brand][week].newAds++
      if (ad.performance_index) byBrandWeek[brand][week].piScores.push(Number(ad.performance_index))
      continue
    }

    for (const est of estimates) {
      const week = est.week_start
      if (fromParam && week < fromParam) continue
      if (toParam && week > toParam) continue
      allWeeks.add(week)
      if (!byBrandWeek[brand]) byBrandWeek[brand] = {}
      if (!byBrandWeek[brand][week]) byBrandWeek[brand][week] = { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
      byBrandWeek[brand][week].totalAds++
      if (isNewAd(ad.first_seen_at, week)) byBrandWeek[brand][week].newAds++
      byBrandWeek[brand][week].spend += Number(est.est_spend_eur ?? 0)
      byBrandWeek[brand][week].reach += Number(est.est_reach ?? 0)
      if (ad.performance_index) byBrandWeek[brand][week].piScores.push(Number(ad.performance_index))
    }
  }

  const sortedWeeks = [...allWeeks].sort()
  const brands = Object.keys(byBrandWeek)

  // Group weeks into period buckets
  const periodBuckets = [...new Set(sortedWeeks.map(w => periodKeyFn(w, period)))].sort()

  function aggBrandBucket(brand: string, bucket: string): BrandWeek {
    const result: BrandWeek = { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
    for (const week of sortedWeeks) {
      if (periodKeyFn(week, period) !== bucket) continue
      const w = byBrandWeek[brand]?.[week]
      if (!w) continue
      result.totalAds += w.totalAds; result.newAds += w.newAds
      result.spend += w.spend; result.reach += w.reach
      result.piScores.push(...w.piScores)
    }
    return result
  }

  function aggBrandAll(brand: string): BrandWeek {
    const result: BrandWeek = { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
    for (const week of sortedWeeks) {
      const w = byBrandWeek[brand]?.[week]
      if (!w) continue
      result.totalAds += w.totalAds; result.newAds += w.newAds
      result.spend += w.spend; result.reach += w.reach
      result.piScores.push(...w.piScores)
    }
    return result
  }

  // Spend movement trend
  const weeklySpendMovement = periodBuckets.map(bucket => {
    const row: Record<string, unknown> = { week: formatPeriod(bucket, period) }
    for (const brand of brands) {
      const key = brand.toLowerCase().replace(/\s+/g, '')
      row[key] = Math.round(aggBrandBucket(brand, bucket).spend)
    }
    return row
  })

  // New ads trend
  const newAdsTrend = periodBuckets.map(bucket => {
    const row: Record<string, unknown> = { week: formatPeriod(bucket, period) }
    for (const brand of brands) {
      const key = brand.toLowerCase().replace(/\s+/g, '')
      row[key] = aggBrandBucket(brand, bucket).newAds
    }
    return row
  })

  // New vs existing per brand (across full range)
  const newVsExisting = brands.map(brand => {
    const agg = aggBrandAll(brand)
    const total = agg.totalAds
    return {
      advertiser: brand,
      newAdsPct: total > 0 ? Math.round((agg.newAds / total) * 100) : 0,
      existingAdsPct: total > 0 ? Math.round(((total - agg.newAds) / total) * 100) : 0,
    }
  })

  // Summary table (full range, not just latest period)
  const table = brands.map(brand => {
    const agg = aggBrandAll(brand)
    const avgPi = agg.piScores.length > 0
      ? Math.round(agg.piScores.reduce((s, v) => s + v, 0) / agg.piScores.length * 10) / 10
      : null
    return {
      advertiser: brand, platform: 'META',
      totalAds: agg.totalAds, newAds: agg.newAds,
      weeklyReach: agg.reach, weeklySpend: Math.round(agg.spend), avgPi,
    }
  })

  // KPIs: full range
  const totalSpend = brands.reduce((s, b) => s + aggBrandAll(b).spend, 0)
  const totalReach = brands.reduce((s, b) => s + aggBrandAll(b).reach, 0)

  // Performance Index trend
  function brandKey(name: string) {
    return name.toLowerCase().replace(/[\s\-_]/g, '')
  }
  const ownBrandFull = brands.find(b => brandKey(b).includes(ownBrand) || ownBrand.includes(brandKey(b))) ?? brands[0]

  const performanceTrend = periodBuckets.map(bucket => {
    const ownAgg = aggBrandBucket(ownBrandFull, bucket)
    const ownAvg = ownAgg.piScores.length > 0
      ? Math.round(ownAgg.piScores.reduce((s, v) => s + v, 0) / ownAgg.piScores.length * 10) / 10 : null
    const allScores = brands.flatMap(b => aggBrandBucket(b, bucket).piScores)
    const marketAvg = allScores.length > 0
      ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length * 10) / 10 : null
    return { week: formatPeriod(bucket, period), orlen: ownAvg, market: marketAvg }
  }).filter(p => p.orlen !== null || p.market !== null)

  return NextResponse.json({
    hasData: true,
    kpis: { totalWeeklySpend: Math.round(totalSpend), totalWeeklyReach: Math.round(totalReach) },
    weeklySpendMovement,
    newAdsTrend,
    newVsExisting,
    table,
    performanceTrend,
  })
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

/**
 * An ad is "new" in the period containing `periodDate` if `first_seen_at`
 * falls in the same calendar month.  Snowflake date buckets are monthly
 * (DATE_TRUNC MONTH) so a 7-day window would wrongly classify the 2nd–4th
 * week of the first month as "existing".
 */
function isNewAd(firstSeenAt: string, periodDate: string): boolean {
  const first = new Date(firstSeenAt)
  const period = new Date(periodDate)
  return (
    first.getUTCFullYear() === period.getUTCFullYear() &&
    first.getUTCMonth()    === period.getUTCMonth()
  )
}

