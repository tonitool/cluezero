/**
 * GET /api/data/dashboard
 *
 * Serves all KPIs and chart data for the full competitive intelligence dashboard.
 * Uses direct Supabase queries — no RPC functions needed.
 *
 * Query params:
 *   workspaceId   (required)
 *   from          (optional) ISO date start
 *   to            (optional) ISO date end
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = admin()
  const { data: membership } = await db.from('workspace_members').select('id')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── Load brands ────────────────────────────────────────────────────────
  const { data: brands } = await db
    .from('tracked_brands')
    .select('id, name, is_own_brand')
    .eq('workspace_id', workspaceId)

  const brandMap = new Map<string, { name: string; isOwn: boolean }>()
  for (const b of brands ?? []) {
    brandMap.set(b.id, { name: b.name, isOwn: b.is_own_brand })
  }
  const ownBrandEntry = [...brandMap.entries()].find(([, v]) => v.isOwn)
  const ownBrandId = ownBrandEntry?.[0] ?? null
  const ownBrandName = ownBrandEntry?.[1].name ?? null

  // ── Load ads ───────────────────────────────────────────────────────────
  const { data: ads } = await db
    .from('ads')
    .select('id, brand_id, platform, headline, first_seen_at, last_seen_at, is_active, global_ad_id, source_platform, format_type')
    .eq('workspace_id', workspaceId)

  const adIds = (ads ?? []).map(a => a.id)

  if (adIds.length === 0) {
    return NextResponse.json({ hasData: false })
  }

  // ── Load spend ─────────────────────────────────────────────────────────
  let spendQuery = db.from('ad_spend_estimates')
    .select('ad_id, week_start, est_spend_eur, est_impressions, est_reach, is_new_ad')
    .in('ad_id', adIds)
  if (from) spendQuery = spendQuery.gte('week_start', from)
  if (to) spendQuery = spendQuery.lte('week_start', to)
  const { data: spendData } = await spendQuery

  // ── Load enrichments ───────────────────────────────────────────────────
  const { data: enrichments } = await db
    .from('ad_enrichments')
    .select('ad_id, funnel_stage, topic, min_age, max_age, gender, target_country')
    .in('ad_id', adIds)

  const enrichmentMap = new Map<string, NonNullable<typeof enrichments>[number]>()
  for (const e of enrichments ?? []) {
    enrichmentMap.set(e.ad_id, e)
  }

  // ── Build ad lookup ────────────────────────────────────────────────────
  const adLookup = new Map<string, NonNullable<typeof ads>[number]>()
  for (const a of ads ?? []) {
    adLookup.set(a.id, a)
  }

  // ── Aggregate ──────────────────────────────────────────────────────────
  const spendByWeek = new Map<string, Map<string, number>>()
  const newAdsByWeek = new Map<string, Map<string, number>>()
  const spendByBrand = new Map<string, number>()
  const platformCounts = new Map<string, number>()
  const funnelCounts = new Map<string, number>()
  const topicCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()
  const genderCounts = new Map<string, number>()
  const ageMinCounts = new Map<number, number>()
  const ageMaxCounts = new Map<number, number>()

  const advertiserPlatformData = new Map<string, {
    advertiser: string; platform: string; totalAds: number; newAds: number;
    spend: number; reach: number; newAdsSpend: number; existingAdsSpend: number;
  }>()

  let totalSpend = 0, totalReach = 0, newAdsSpend = 0, existingAdsSpend = 0
  let newAdsCount = 0, ownBrandNewAds = 0, ownBrandReach = 0
  const ownBrandSpendTotal: number[] = []

  // Determine which ads are "new" (first_seen_at within the period)
  const newAdIds = new Set<string>()
  for (const ad of ads ?? []) {
    if (from && ad.first_seen_at >= from) {
      newAdIds.add(ad.id)
    }
  }

  for (const s of spendData ?? []) {
    const ad = adLookup.get(s.ad_id)
    if (!ad) continue
    const brandInfo = brandMap.get(ad.brand_id)
    if (!brandInfo) continue

    const spend = s.est_spend_eur ?? 0
    const reach = s.est_reach ?? 0
    const isNew = s.is_new_ad || newAdIds.has(s.ad_id)

    totalSpend += spend
    totalReach += reach
    if (isNew) { newAdsSpend += spend; newAdsCount += 1 }
    else { existingAdsSpend += spend }

    if (brandInfo.isOwn) {
      ownBrandSpendTotal.push(spend)
      ownBrandReach += reach
      if (isNew) ownBrandNewAds += 1
    }

    // Weekly aggregation
    const week = s.week_start
    if (!spendByWeek.has(week)) spendByWeek.set(week, new Map())
    const weekBrandSpend = spendByWeek.get(week)!
    weekBrandSpend.set(brandInfo.name, (weekBrandSpend.get(brandInfo.name) ?? 0) + spend)

    if (isNew) {
      if (!newAdsByWeek.has(week)) newAdsByWeek.set(week, new Map())
      const weekBrandNew = newAdsByWeek.get(week)!
      weekBrandNew.set(brandInfo.name, (weekBrandNew.get(brandInfo.name) ?? 0) + 1)
    }

    // Brand spend
    spendByBrand.set(brandInfo.name, (spendByBrand.get(brandInfo.name) ?? 0) + spend)

    // Platform
    const platform = (ad.source_platform ?? ad.platform ?? 'unknown').toUpperCase()
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1)

    // Advertiser × Platform
    const advKey = `${brandInfo.name}::${platform}`
    if (!advertiserPlatformData.has(advKey)) {
      advertiserPlatformData.set(advKey, { advertiser: brandInfo.name, platform, totalAds: 0, newAds: 0, spend: 0, reach: 0, newAdsSpend: 0, existingAdsSpend: 0 })
    }
    const advP = advertiserPlatformData.get(advKey)!
    advP.totalAds += 1
    advP.spend += spend
    advP.reach += reach
    if (isNew) { advP.newAds += 1; advP.newAdsSpend += spend }
    else { advP.existingAdsSpend += spend }
  }

  // Enrichment aggregations
  for (const e of enrichments ?? []) {
    if (e.funnel_stage) funnelCounts.set(e.funnel_stage, (funnelCounts.get(e.funnel_stage) ?? 0) + 1)
    if (e.topic) topicCounts.set(e.topic, (topicCounts.get(e.topic) ?? 0) + 1)
    if (e.target_country) countryCounts.set(e.target_country, (countryCounts.get(e.target_country) ?? 0) + 1)
    if (e.gender) genderCounts.set(e.gender, (genderCounts.get(e.gender) ?? 0) + 1)
    if (e.min_age) ageMinCounts.set(e.min_age, (ageMinCounts.get(e.min_age) ?? 0) + 1)
    if (e.max_age) ageMaxCounts.set(e.max_age, (ageMaxCounts.get(e.max_age) ?? 0) + 1)
  }

  // ── Section 1: Executive Summary ───────────────────────────────────────
  const ownSpend = ownBrandSpendTotal.reduce((s, v) => s + v, 0)
  const ownShare = totalSpend > 0 ? (ownSpend / totalSpend * 100) : 0

  const executiveSummary = {
    monthlyEstSpend: Math.round(totalSpend * 100) / 100,
    monthlyEstSpendDelta: 0, // TODO: compute from previous period
    ownBrandShareOfSpend: Math.round(ownShare * 100) / 100,
    avgPerformanceIndexNewAds: null,
    newAdsThisMonth: newAdsCount,
    ownBrandNewAds: ownBrandNewAds,
    ownBrandAvgPI: null,
  }

  // ── Section 2: Spend Movement ──────────────────────────────────────────
  const spendMovement = [...spendByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, brandSpend]) => {
      const row: Record<string, unknown> = { week }
      for (const [brand, spend] of brandSpend) row[brand] = spend
      return row
    })

  // ── Section 3: Spend Share Trend ───────────────────────────────────────
  const spendShareTrend = [...spendByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, brandSpend]) => {
      const weekTotal = [...brandSpend.values()].reduce((s, v) => s + v, 0)
      const ownSp = ownBrandName ? brandSpend.get(ownBrandName) ?? 0 : 0
      return {
        week,
        ownBrandShare: weekTotal > 0 ? Math.round(ownSp / weekTotal * 10000) / 100 : 0,
        marketAvg: weekTotal > 0 ? Math.round(weekTotal / Math.max(brandSpend.size, 1) * 100) / 100 : 0,
      }
    })

  // ── Section 4: Monthly Movement ────────────────────────────────────────
  const monthlyMovement = {
    monthlyEstReach: totalReach,
    totalMarketMonthlyEstReach: totalReach,
    monthlyEstSpend: Math.round(totalSpend * 100) / 100,
    totalMarketMonthlyEstSpend: Math.round(totalSpend * 100) / 100,
    spendFromNewAds: Math.round(newAdsSpend * 100) / 100,
    spendFromExistingAds: Math.round(existingAdsSpend * 100) / 100,
    newAdsPct: totalSpend > 0 ? Math.round(newAdsSpend / totalSpend * 10000) / 100 : 0,
    existingAdsPct: totalSpend > 0 ? Math.round(existingAdsSpend / totalSpend * 10000) / 100 : 0,
  }

  // ── Section 5: Advertiser × Platform ───────────────────────────────────
  const advertiserPlatformTable = [...advertiserPlatformData.values()].map(d => ({
    advertiser: d.advertiser,
    platform: d.platform,
    totalAds: d.totalAds,
    newAds: d.newAds,
    monthlyEstReach: d.reach,
    monthlyEstSpend: Math.round(d.spend * 100) / 100,
    avgPerfIndex: null,
    avgPerfIdxNewAds: null,
    prevMonthEstSpend: null,
    monthlyEstSpendOnNewAds: Math.round(d.newAdsSpend * 100) / 100,
    monthlyEstSpendOnExistingAds: Math.round(d.existingAdsSpend * 100) / 100,
  }))

  // ── Section 6: New Ads per Advertiser ──────────────────────────────────
  const newAdsPerAdvertiser = [...newAdsByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, brandNew]) => {
      const row: Record<string, unknown> = { week }
      for (const [brand, count] of brandNew) row[brand] = count
      return row
    })

  // ── Section 8: Platform Distribution ───────────────────────────────────
  const platformDistribution = [...platformCounts.entries()].map(([platform, count]) => ({ platform, count }))

  // ── Section 12: Topic Benchmark ────────────────────────────────────────
  const topicDistribution = [...topicCounts.entries()].map(([topic, count]) => ({ topic, count }))

  // ── Section 13: Funnel Benchmark ───────────────────────────────────────
  const funnelDistribution = [...funnelCounts.entries()].map(([stage, count]) => ({ stage, count }))

  // ── Section 14: Audience Benchmark ─────────────────────────────────────
  const audienceBenchmark = {
    genderDistribution: [...genderCounts.entries()].map(([gender, count]) => ({ gender, count })),
    minAgeDistribution: [...ageMinCounts.entries()].map(([age, count]) => ({ age, count })),
    maxAgeDistribution: [...ageMaxCounts.entries()].map(([age, count]) => ({ age, count })),
  }

  // ── Section 15: Targeting Location ─────────────────────────────────────
  const targetingLocation = [...countryCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))

  // ── Section 16: Own Brand vs Market Average ────────────────────────────
  const ownBrandAds = ads?.filter(a => a.brand_id === ownBrandId) ?? []
  const marketAvgAds = ads?.length ?? 0 > 0 ? Math.round((ads?.length ?? 0) / Math.max(brandMap.size, 1)) : 0

  const ownVsMarket = {
    ownBrand: {
      totalAds: ownBrandAds.length,
      performanceIndex: null,
      topCreativeScore: null,
      totalEstReach: ownBrandReach,
    },
    marketAvg: {
      totalAds: marketAvgAds,
      performanceIndex: null,
      topCreativeScore: null,
      totalEstReach: brandMap.size > 1 ? Math.round(totalReach / (brandMap.size - 1)) : 0,
    },
  }

  // ── Section 17: Competitor Strategy Profiles ───────────────────────────
  const strategyProfiles = []
  for (const [brandId, info] of brandMap) {
    const brandAds = ads?.filter(a => a.brand_id === brandId) ?? []
    const brandAdIds = brandAds.map(a => a.id)

    let brandSpend = 0, brandReach = 0
    const brandPlatformCounts = new Map<string, number>()
    const brandFunnelCounts = new Map<string, number>()

    for (const ad of brandAds) {
      const platform = (ad.source_platform ?? ad.platform ?? 'unknown').toUpperCase()
      brandPlatformCounts.set(platform, (brandPlatformCounts.get(platform) ?? 0) + 1)
    }

    for (const s of spendData ?? []) {
      if (brandAdIds.includes(s.ad_id)) {
        brandSpend += s.est_spend_eur ?? 0
        brandReach += s.est_reach ?? 0
      }
    }

    for (const e of enrichments ?? []) {
      if (brandAdIds.includes(e.ad_id) && e.funnel_stage) {
        brandFunnelCounts.set(e.funnel_stage, (brandFunnelCounts.get(e.funnel_stage) ?? 0) + 1)
      }
    }

    const totalAds = brandAds.length
    const platformPct: Record<string, number> = {}
    for (const [p, c] of brandPlatformCounts) platformPct[p] = totalAds > 0 ? Math.round(c / totalAds * 10000) / 100 : 0
    const funnelPct: Record<string, number> = {}
    for (const [f, c] of brandFunnelCounts) funnelPct[f] = totalAds > 0 ? Math.round(c / totalAds * 10000) / 100 : 0

    strategyProfiles.push({
      advertiser: info.name,
      totalAdsAlltime: totalAds,
      platformPct,
      funnelPct,
      totalEstSpend: Math.round(brandSpend * 100) / 100,
      totalEstReach: brandReach,
    })
  }

  // ── Section 18: Opportunities ──────────────────────────────────────────
  const opportunities = platformDistribution
    .map(({ platform, count }) => ({
      platform,
      topic: 'All',
      marketAds: count,
      activeAdvertisers: brandMap.size,
      opportunityScore: Math.round(count * 0.7),
    }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 10)

  return NextResponse.json({
    hasData: true,
    executiveSummary,
    spendMovement,
    spendShareTrend,
    monthlyMovement,
    advertiserPlatformTable,
    newAdsPerAdvertiser,
    avgPITrend: [],
    platformDistribution,
    platformSpendDistribution: [],
    topicDistribution,
    funnelDistribution,
    audienceBenchmark,
    targetingLocation,
    ownVsMarket,
    strategyProfiles,
    opportunities,
  })
}
