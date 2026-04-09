import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
    .eq('is_active', true)
  if (connectionId) adsQuery = adsQuery.eq('connection_id', connectionId)
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
      // Ad has no spend estimates — count it in the week of first_seen_at
      const week = getWeekStart(ad.first_seen_at)
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

  // Weekly spend movement: [{ week, brand1: spend, brand2: spend }]
  const weeklySpendMovement = sortedWeeks.map(week => {
    const row: Record<string, unknown> = { week: formatWeek(week) }
    for (const brand of brands) {
      const key = brand.toLowerCase().replace(/\s+/g, '')
      row[key] = Math.round(byBrandWeek[brand]?.[week]?.spend ?? 0)
    }
    return row
  })

  // New ads trend: [{ week, brand1: newAds, brand2: newAds }]
  const newAdsTrend = sortedWeeks.map(week => {
    const row: Record<string, unknown> = { week: formatWeek(week) }
    for (const brand of brands) {
      const key = brand.toLowerCase().replace(/\s+/g, '')
      row[key] = byBrandWeek[brand]?.[week]?.newAds ?? 0
    }
    return row
  })

  // New vs existing per brand (across all weeks)
  const newVsExisting = brands.map(brand => {
    let totalNew = 0, totalExisting = 0
    for (const week of sortedWeeks) {
      const w = byBrandWeek[brand]?.[week]
      if (w) { totalNew += w.newAds; totalExisting += (w.totalAds - w.newAds) }
    }
    const total = totalNew + totalExisting
    return {
      advertiser:    brand,
      newAdsPct:     total > 0 ? Math.round((totalNew / total) * 100) : 0,
      existingAdsPct: total > 0 ? Math.round((totalExisting / total) * 100) : 0,
    }
  })

  // Summary table (latest week)
  const latestWeek = sortedWeeks[sortedWeeks.length - 1]
  const table = brands.map(brand => {
    const w = byBrandWeek[brand]?.[latestWeek] ?? { totalAds: 0, newAds: 0, spend: 0, reach: 0, piScores: [] }
    const avgPi = w.piScores.length > 0
      ? Math.round(w.piScores.reduce((s, v) => s + v, 0) / w.piScores.length * 10) / 10
      : null
    return {
      advertiser:  brand,
      platform:    'META',
      totalAds:    w.totalAds,
      newAds:      w.newAds,
      weeklyReach: w.reach,
      weeklySpend: Math.round(w.spend),
      avgPi,
    }
  })

  // KPIs from latest week
  const totalSpend = brands.reduce((s, b) => s + (byBrandWeek[b]?.[latestWeek]?.spend ?? 0), 0)
  const totalReach = brands.reduce((s, b) => s + (byBrandWeek[b]?.[latestWeek]?.reach ?? 0), 0)

  // Performance Index trend: own brand vs market average per week
  // Match own brand by fuzzy key (same as brandKey logic)
  function brandKey(name: string) {
    return name.toLowerCase().replace(/[\s\-_]/g, '')
  }
  const ownBrandFull = brands.find(b => brandKey(b).includes(ownBrand) || ownBrand.includes(brandKey(b))) ?? brands[0]

  const performanceTrend = sortedWeeks.map(week => {
    // Own brand avg PI this week
    const ownScores = byBrandWeek[ownBrandFull]?.[week]?.piScores ?? []
    const ownAvg = ownScores.length > 0
      ? Math.round(ownScores.reduce((s, v) => s + v, 0) / ownScores.length * 10) / 10
      : null

    // Market avg PI this week (all brands)
    const allScores = brands.flatMap(b => byBrandWeek[b]?.[week]?.piScores ?? [])
    const marketAvg = allScores.length > 0
      ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length * 10) / 10
      : null

    return { week: formatWeek(week), orlen: ownAvg, market: marketAvg }
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

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
