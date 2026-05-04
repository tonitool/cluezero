import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCampaignPerformanceComposio as getGoogleCampaigns, getTopAdsComposio as getGoogleTopAds } from '@/lib/google-ads'
import { getMetaCampaignPerformanceComposio, getMetaTopAdsComposio } from '@/lib/meta-ads'

export const runtime = 'nodejs'
export const maxDuration = 120

// ─── Tool definitions (what Claude can call) ──────────────────────────────────

const TOOLS = [
  {
    name: 'get_market_overview',
    description:
      'Get a competitive market overview: all tracked brands ranked by spend share, WoW changes, new ad counts, and average Performance Index. Use this first to understand the full picture.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_brand_analysis',
    description:
      'Deep-dive into a specific brand — weekly spend trend, PI scores, funnel mix, top topics, and recent ad headlines.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brand_name: { type: 'string', description: 'Exact brand name as it appears in the data' },
      },
      required: ['brand_name'],
    },
  },
  {
    name: 'get_top_creatives',
    description:
      'Fetch best or worst performing creatives by Performance Index. Optionally filter by brand or funnel stage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brand_name:   { type: 'string', description: 'Filter by brand (optional — omit for all brands)' },
        funnel_stage: { type: 'string', enum: ['See', 'Think', 'Do', 'Care'], description: 'Filter by funnel stage (optional)' },
        sort:         { type: 'string', enum: ['top', 'bottom'], description: 'top = highest PI first, bottom = lowest PI first' },
        limit:        { type: 'number', description: 'How many creatives to return (default 5, max 20)' },
      },
      required: [],
    },
  },
  {
    name: 'get_whitespace_opportunities',
    description:
      'Identify gaps in the competitive landscape — funnel stages, channels, or topics where competition is low and the client brand could gain ground.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_own_campaign_performance',
    description:
      'Fetch the client\'s own live campaign performance from their connected Google Ads or Meta Ads account — real spend, clicks, CTR, ROAS, and conversions. Use this when the user asks about their own campaigns, budget, or ad account performance.',
    input_schema: {
      type: 'object' as const,
      properties: {
        platform: { type: 'string', enum: ['google_ads', 'meta_ads', 'all'], description: 'Which platform to pull from (default: all)' },
        days:     { type: 'number', description: 'Lookback window in days (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_own_top_ads',
    description:
      'Get the client\'s top performing ads from their connected Google Ads or Meta Ads account, ranked by clicks. Includes ad name/headline, spend, CTR, and conversions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        platform: { type: 'string', enum: ['google_ads', 'meta_ads', 'all'], description: 'Which platform (default: all)' },
        days:     { type: 'number', description: 'Lookback window in days (default 30)' },
        limit:    { type: 'number', description: 'Number of ads to return (default 5, max 10)' },
      },
      required: [],
    },
  },
  {
    name: 'compare_brands',
    description:
      'Side-by-side comparison of two or more brands across spend, PI, funnel strategy, and platform mix.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brands: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of brand names to compare (2-5 brands)',
        },
      },
      required: ['brands'],
    },
  },
]

// ─── Tool executors ───────────────────────────────────────────────────────────

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any

interface AdRow {
  id:                string
  first_seen_at:     string
  performance_index: number | null
  topic:             string | null
  headline:          string | null
  platform:          string | null
  tracked_brands:    { name: string; is_own_brand: boolean } | null
  ad_spend_estimates: { week_start: string; est_spend_eur: number | null; est_reach: number | null }[]
  ad_enrichments:    { funnel_stage: string | null }[]
}

async function fetchAllAds(admin: AdminClient, workspaceId: string, connectionId?: string): Promise<AdRow[]> {
  let q = admin
    .from('ads')
    .select(`id, first_seen_at, performance_index, topic, headline, platform,
      tracked_brands ( name, is_own_brand ),
      ad_spend_estimates ( week_start, est_spend_eur, est_reach ),
      ad_enrichments ( funnel_stage )`)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
  if (connectionId) q = q.eq('connection_id', connectionId)
  const { data } = await q
  return (data as AdRow[]) ?? []
}

function aggregateBrands(rows: Awaited<ReturnType<typeof fetchAllAds>>) {
  const byBrand: Record<string, {
    name: string; isOwnBrand: boolean; totalAds: number; newAdsThisWeek: number
    latestWeekSpend: number; prevWeekSpend: number; totalSpend: number
    piScores: number[]; funnelStages: string[]; topics: string[]; platforms: string[]
    recentHeadlines: string[]
  }> = {}
  const allWeeks = new Set<string>()

  for (const ad of rows) {
    const name = ad.tracked_brands?.name ?? 'Unknown'
    const isOwn = ad.tracked_brands?.is_own_brand ?? false
    if (!byBrand[name]) {
      byBrand[name] = { name, isOwnBrand: isOwn, totalAds: 0, newAdsThisWeek: 0, latestWeekSpend: 0, prevWeekSpend: 0, totalSpend: 0, piScores: [], funnelStages: [], topics: [], platforms: [], recentHeadlines: [] }
    }
    const b = byBrand[name]
    b.totalAds++
    if (ad.performance_index != null) b.piScores.push(Number(ad.performance_index))
    if (ad.topic)    b.topics.push(ad.topic)
    if (ad.platform) b.platforms.push(ad.platform)
    if (ad.headline) b.recentHeadlines.push(ad.headline)
    for (const e of (ad.ad_enrichments ?? [])) {
      if (e.funnel_stage) b.funnelStages.push(e.funnel_stage)
    }
    for (const est of (ad.ad_spend_estimates ?? [])) {
      allWeeks.add(est.week_start)
      b.totalSpend += Number(est.est_spend_eur ?? 0)
    }
  }

  const sortedWeeks = [...allWeeks].sort()
  const latestWeek  = sortedWeeks[sortedWeeks.length - 1]
  const prevWeek    = sortedWeeks[sortedWeeks.length - 2]

  for (const ad of rows) {
    const name = ad.tracked_brands?.name ?? 'Unknown'
    for (const est of (ad.ad_spend_estimates ?? [])) {
      if (est.week_start === latestWeek) byBrand[name].latestWeekSpend += Number(est.est_spend_eur ?? 0)
      if (prevWeek && est.week_start === prevWeek) byBrand[name].prevWeekSpend += Number(est.est_spend_eur ?? 0)
    }
    if (getWeekStart(ad.first_seen_at) === latestWeek) byBrand[name].newAdsThisWeek++
  }

  return { byBrand, latestWeek, prevWeek, sortedWeeks }
}

function avgPi(scores: number[]) {
  return scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null
}

function topN<T>(arr: T[], key: (v: T) => number, n: number) {
  return [...arr].sort((a, b) => key(b) - key(a)).slice(0, n)
}

function countBy<T>(arr: T[], key: (v: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of arr) { const k = key(v); out[k] = (out[k] ?? 0) + 1 }
  return out
}

// ── Tool: get_market_overview ─────────────────────────────────────────────────
async function toolMarketOverview(admin: AdminClient, workspaceId: string, connectionId?: string, ownBrand?: string): Promise<string> {
  const rows = await fetchAllAds(admin, workspaceId, connectionId)
  if (!rows.length) return 'No ad data found. Please sync your data source first.'

  const { byBrand, latestWeek, prevWeek, sortedWeeks } = aggregateBrands(rows)
  const totalSpend = Object.values(byBrand).reduce((s, b) => s + b.latestWeekSpend, 0)
  const totalMarketPiScores = Object.values(byBrand).flatMap(b => b.piScores)
  const marketAvgPi = avgPi(totalMarketPiScores)

  const brands = Object.values(byBrand).sort((a, b) => b.latestWeekSpend - a.latestWeekSpend)

  const lines = brands.map(b => {
    const share = totalSpend > 0 ? ((b.latestWeekSpend / totalSpend) * 100).toFixed(1) : '0'
    const wow = b.latestWeekSpend > 0 && b.prevWeekSpend > 0
      ? ((b.latestWeekSpend - b.prevWeekSpend) / b.prevWeekSpend * 100).toFixed(0) + '%'
      : 'N/A'
    const pi = avgPi(b.piScores)
    const ownTag = b.isOwnBrand || b.name.toLowerCase().includes((ownBrand ?? '').toLowerCase()) ? ' [CLIENT]' : ''
    return `- ${b.name}${ownTag}: ${b.totalAds} active ads, ${b.newAdsThisWeek} new this week, est. spend €${Math.round(b.latestWeekSpend).toLocaleString()} (${share}% share, WoW ${wow}), avg PI ${pi ?? 'N/A'}`
  })

  return [
    `Market overview — week of ${latestWeek ? new Date(latestWeek).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} (${sortedWeeks.length} weeks of history)`,
    `Total market est. weekly spend: €${Math.round(totalSpend).toLocaleString()}`,
    `Market avg Performance Index: ${marketAvgPi ?? 'N/A'}`,
    `Tracked brands: ${brands.length}`,
    '',
    ...lines,
  ].join('\n')
}

// ── Tool: get_brand_analysis ──────────────────────────────────────────────────
async function toolBrandAnalysis(admin: AdminClient, workspaceId: string, brandName: string, connectionId?: string): Promise<string> {
  const rows = await fetchAllAds(admin, workspaceId, connectionId)
  const { byBrand, sortedWeeks } = aggregateBrands(rows)

  const match = Object.values(byBrand).find(b =>
    b.name.toLowerCase().includes(brandName.toLowerCase()) ||
    brandName.toLowerCase().includes(b.name.toLowerCase())
  )
  if (!match) return `Brand "${brandName}" not found. Available brands: ${Object.keys(byBrand).join(', ')}`

  const totalSpend = Object.values(byBrand).reduce((s, b) => s + b.latestWeekSpend, 0)
  const share = totalSpend > 0 ? ((match.latestWeekSpend / totalSpend) * 100).toFixed(1) : '0'
  const pi = avgPi(match.piScores)
  const marketPi = avgPi(Object.values(byBrand).flatMap(b => b.piScores))

  const funnelCounts = countBy(match.funnelStages, s => s)
  const funnelDist = Object.entries(funnelCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([s, c]) => `${s} ${Math.round(c / match.funnelStages.length * 100)}%`)
    .join(', ') || 'N/A'

  const topicCounts = countBy(match.topics, t => t)
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => `${t} (${c})`).join(', ') || 'N/A'

  const platformCounts = countBy(match.platforms, p => p)
  const platformStr = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([p, c]) => `${p} ${c}`).join(', ') || 'N/A'

  const headlines = [...new Set(match.recentHeadlines)].slice(0, 5).map(h => `  • "${h}"`).join('\n')

  const wow = match.latestWeekSpend > 0 && match.prevWeekSpend > 0
    ? ((match.latestWeekSpend - match.prevWeekSpend) / match.prevWeekSpend * 100).toFixed(0) + '%'
    : 'N/A'

  return [
    `Brand analysis: ${match.name}`,
    `Active ads: ${match.totalAds}`,
    `New ads this week: ${match.newAdsThisWeek}`,
    `Est. weekly spend: €${Math.round(match.latestWeekSpend).toLocaleString()} (${share}% market share, WoW ${wow})`,
    `Avg Performance Index: ${pi ?? 'N/A'} (market avg: ${marketPi ?? 'N/A'})`,
    `Funnel distribution: ${funnelDist}`,
    `Top topics: ${topTopics}`,
    `Platform activity: ${platformStr}`,
    `Recent headlines:\n${headlines || '  N/A'}`,
    `History: ${sortedWeeks.length} weeks tracked`,
  ].join('\n')
}

// ── Tool: get_top_creatives ───────────────────────────────────────────────────
async function toolTopCreatives(
  admin: AdminClient, workspaceId: string,
  brandName?: string, funnelStage?: string, sort = 'top', limit = 5, connectionId?: string
): Promise<string> {
  let q = admin
    .from('ads')
    .select(`headline, performance_index, platform, first_seen_at,
      tracked_brands ( name ),
      ad_enrichments ( funnel_stage )`)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .not('performance_index', 'is', null)
  if (connectionId) q = q.eq('connection_id', connectionId)

  const { data: rawRows } = await q
  if (!rawRows?.length) return 'No creative data found.'
  const rows = rawRows as unknown as AdRow[]

  let items = rows.map(r => ({
    headline:   r.headline ?? '(no headline)',
    pi:         Number(r.performance_index),
    platform:   r.platform ?? '',
    brand:      r.tracked_brands?.name ?? 'Unknown',
    funnel:     r.ad_enrichments?.[0]?.funnel_stage ?? 'N/A',
    firstSeen:  r.first_seen_at,
  }))

  if (brandName) items = items.filter(i => i.brand.toLowerCase().includes(brandName.toLowerCase()))
  if (funnelStage) items = items.filter(i => i.funnel === funnelStage)

  items = sort === 'bottom'
    ? items.sort((a, b) => a.pi - b.pi)
    : items.sort((a, b) => b.pi - a.pi)
  items = items.slice(0, Math.min(limit, 20))

  if (!items.length) return `No creatives found matching filters (brand: ${brandName ?? 'any'}, funnel: ${funnelStage ?? 'any'}).`

  const header = sort === 'bottom' ? 'Lowest performing creatives' : 'Top performing creatives'
  const filterStr = [brandName && `brand: ${brandName}`, funnelStage && `funnel: ${funnelStage}`].filter(Boolean).join(', ')

  return [
    `${header}${filterStr ? ` (${filterStr})` : ''}:`,
    ...items.map((i, idx) => `${idx + 1}. [PI ${i.pi}] ${i.brand} · ${i.platform} · ${i.funnel} · "${i.headline}"`),
  ].join('\n')
}

// ── Tool: get_whitespace_opportunities ───────────────────────────────────────
async function toolWhitespace(admin: AdminClient, workspaceId: string, ownBrand: string, connectionId?: string): Promise<string> {
  const rows = await fetchAllAds(admin, workspaceId, connectionId)
  const { byBrand } = aggregateBrands(rows)

  const ownEntry = Object.values(byBrand).find(b =>
    b.isOwnBrand || b.name.toLowerCase().includes(ownBrand.toLowerCase())
  )

  // Funnel coverage
  const allFunnel = rows.flatMap(r => (r.ad_enrichments ?? []).map(e => e.funnel_stage).filter(Boolean) as string[])
  const funnelTotal = countBy(allFunnel, s => s)
  const funnelLow = Object.entries(funnelTotal).filter(([, c]) => c / allFunnel.length < 0.1).map(([s]) => s)

  // Platform coverage
  const allPlatforms = rows.map(r => r.platform ?? '').filter(Boolean)
  const platformTotal = countBy(allPlatforms, p => p)
  const sortedPlatforms = Object.entries(platformTotal).sort((a, b) => a[1] - b[1])

  // Topic whitespace (topics with few competitors covering them)
  const allTopics = rows.map(r => r.topic ?? '').filter(Boolean)
  const topicCounts = countBy(allTopics, t => t)
  const lowTopics = Object.entries(topicCounts).filter(([, c]) => c < 3).map(([t]) => t).slice(0, 5)

  // Own brand coverage gaps
  const ownFunnelCounts = ownEntry ? countBy(ownEntry.funnelStages, s => s) : {}
  const ownPlatformCounts = ownEntry ? countBy(ownEntry.platforms, p => p) : {}
  const missingFunnel = ['See', 'Think', 'Do', 'Care'].filter(f => !ownFunnelCounts[f] || ownFunnelCounts[f] < 2)
  const activePlatforms = Object.keys(platformTotal)
  const missingPlatforms = activePlatforms.filter(p => !ownPlatformCounts[p] || ownPlatformCounts[p] < 2)

  const lines: string[] = [
    `Whitespace analysis for ${ownEntry?.name ?? ownBrand}:`,
    '',
    '── Funnel stage gaps (market-wide low coverage):',
    funnelLow.length ? funnelLow.map(f => `  • ${f} stage is underserved across all brands`).join('\n') : '  • No major funnel gaps detected',
    '',
    `── ${ownEntry?.name ?? ownBrand} missing coverage:`,
    missingFunnel.length ? missingFunnel.map(f => `  • No/minimal ${f}-stage ads — competitors are active here`).join('\n') : '  • Good coverage across all funnel stages',
    missingPlatforms.length ? missingPlatforms.map(p => `  • ${p} — competitors active but your brand has low presence`).join('\n') : '',
    '',
    '── Low-competition topics (fewer than 3 ads industry-wide):',
    lowTopics.length ? lowTopics.map(t => `  • "${t}"`).join('\n') : '  • No obvious topic gaps found',
    '',
    '── Platform opportunity:',
    ...sortedPlatforms.slice(0, 2).map(([p, c]) => `  • ${p}: only ${c} ads market-wide — low competition channel`),
  ]

  return lines.filter(l => l !== undefined).join('\n')
}

// ── Tool: compare_brands ──────────────────────────────────────────────────────
async function toolCompareBrands(admin: AdminClient, workspaceId: string, brandNames: string[], connectionId?: string): Promise<string> {
  const rows = await fetchAllAds(admin, workspaceId, connectionId)
  const { byBrand } = aggregateBrands(rows)
  const totalSpend = Object.values(byBrand).reduce((s, b) => s + b.latestWeekSpend, 0)

  const matched = brandNames.map(name =>
    Object.values(byBrand).find(b =>
      b.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(b.name.toLowerCase())
    )
  ).filter(Boolean) as (typeof byBrand[string])[]

  if (matched.length < 2) return `Could not match enough brands. Found: ${matched.map(b => b.name).join(', ')}. Available: ${Object.keys(byBrand).join(', ')}`

  const header = ['Metric', ...matched.map(b => b.name)].join(' | ')
  const sep    = ['-'.repeat(16), ...matched.map(b => '-'.repeat(b.name.length + 4))].join('-|-')

  const row = (label: string, vals: string[]) => [label, ...vals].join(' | ')

  return [
    `Brand comparison: ${matched.map(b => b.name).join(' vs ')}`,
    '',
    header, sep,
    row('Active ads',   matched.map(b => String(b.totalAds))),
    row('New this week', matched.map(b => String(b.newAdsThisWeek))),
    row('Est. spend',   matched.map(b => `€${Math.round(b.latestWeekSpend).toLocaleString()}`)),
    row('Spend share',  matched.map(b => totalSpend > 0 ? ((b.latestWeekSpend / totalSpend) * 100).toFixed(1) + '%' : 'N/A')),
    row('Avg PI',       matched.map(b => String(avgPi(b.piScores) ?? 'N/A'))),
    row('Top funnel',   matched.map(b => {
      const counts = countBy(b.funnelStages, s => s)
      return Object.entries(counts).sort((a, x) => x[1] - a[1])[0]?.[0] ?? 'N/A'
    })),
    row('Top topic',    matched.map(b => {
      const counts = countBy(b.topics, t => t)
      return Object.entries(counts).sort((a, x) => x[1] - a[1])[0]?.[0] ?? 'N/A'
    })),
    row('Top platform', matched.map(b => {
      const counts = countBy(b.platforms, p => p)
      return Object.entries(counts).sort((a, x) => x[1] - a[1])[0]?.[0] ?? 'N/A'
    })),
  ].join('\n')
}

// ── Tool: get_own_campaign_performance ────────────────────────────────────────

interface AdConnection {
  id: string
  platform: 'google_ads' | 'meta_ads'
  account_id: string
  account_name: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  status: string
}

async function toolOwnCampaigns(
  admin: AdminClient,
  workspaceId: string,
  platform = 'all',
  days = 30,
): Promise<string> {
  const { data: conns } = await admin
    .from('connections')
    .select('id, app_name, name, config, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .in('app_name', ['googleads', 'meta'])

  const connections: { app_name: string; name: string; config: Record<string, unknown> }[] = conns ?? []
  if (!connections.length) {
    return 'No ad platform accounts connected. Ask the user to connect their Google Ads or Meta Ads account in the Connections section.'
  }

  const filtered = platform === 'all' ? connections : connections.filter(c => {
    if (platform === 'google_ads') return c.app_name === 'googleads'
    if (platform === 'meta_ads') return c.app_name === 'meta'
    return c.app_name === platform
  })
  if (!filtered.length) return `No connected ${platform} account found.`

  const sections: string[] = []

  for (const conn of filtered) {
    try {
      if (conn.app_name === 'googleads') {
        const customerId = conn.config?.customerId as string | undefined
        if (!customerId) { sections.push(`Google Ads (${conn.name}): No customer ID configured.`); continue }
        const campaigns = await getGoogleCampaigns(workspaceId, customerId.replace(/-/g, ''), days)
        if (!campaigns.length) {
          sections.push(`Google Ads (${conn.name}): No active campaigns in last ${days} days.`)
          continue
        }
        const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
        const totalConvs  = campaigns.reduce((s, c) => s + c.conversions, 0)
        const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
        const totalImpr   = campaigns.reduce((s, c) => s + c.impressions, 0)
        const avgRoas     = campaigns.filter(c => c.roas).map(c => c.roas!).reduce((s, r) => s + r, 0) / campaigns.filter(c => c.roas).length || null

        const lines = campaigns.slice(0, 5).map(c =>
          `  - ${c.campaignName} [${c.status}]: €${c.spend.toFixed(2)} spend, ${c.clicks} clicks, CTR ${(c.ctr * 100).toFixed(2)}%, ${c.conversions} conv, ROAS ${c.roas?.toFixed(2) ?? 'N/A'}`
        )
        sections.push([
          `Google Ads — ${conn.name} (last ${days} days):`,
          `  Total spend: €${totalSpend.toFixed(2)} | Clicks: ${totalClicks.toLocaleString()} | Impressions: ${totalImpr.toLocaleString()} | Conversions: ${totalConvs} | Avg ROAS: ${avgRoas?.toFixed(2) ?? 'N/A'}`,
          `  Top campaigns:`,
          ...lines,
        ].join('\n'))

      } else if (conn.app_name === 'meta') {
        const accountId = conn.config?.accountId as string | undefined
        if (!accountId) { sections.push(`Meta Ads (${conn.name}): No account ID configured.`); continue }
        const campaigns = await getMetaCampaignPerformanceComposio(workspaceId, accountId, days)
        if (!campaigns.length) {
          sections.push(`Meta Ads (${conn.name}): No active campaigns in last ${days} days.`)
          continue
        }
        const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
        const totalConvs  = campaigns.reduce((s, c) => s + c.conversions, 0)
        const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
        const totalReach  = campaigns.reduce((s, c) => s + c.reach, 0)
        const avgRoas     = campaigns.filter(c => c.roas).map(c => c.roas!).reduce((s, r) => s + r, 0) / campaigns.filter(c => c.roas).length || null

        const lines = campaigns.slice(0, 5).map(c =>
          `  - ${c.campaignName} [${c.status}]: $${c.spend.toFixed(2)} spend, ${c.clicks} clicks, CTR ${(c.ctr * 100).toFixed(2)}%, reach ${c.reach.toLocaleString()}, ${c.conversions} conv, ROAS ${c.roas?.toFixed(2) ?? 'N/A'}`
        )
        sections.push([
          `Meta Ads — ${conn.name} (last ${days} days):`,
          `  Total spend: $${totalSpend.toFixed(2)} | Clicks: ${totalClicks.toLocaleString()} | Reach: ${totalReach.toLocaleString()} | Conversions: ${totalConvs} | Avg ROAS: ${avgRoas?.toFixed(2) ?? 'N/A'}`,
          `  Top campaigns:`,
          ...lines,
        ].join('\n'))
      }
    } catch (err) {
      sections.push(`${conn.app_name} (${conn.name}): Error fetching data — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return sections.join('\n\n') || 'No campaign data found.'
}

// ── Tool: get_own_top_ads ─────────────────────────────────────────────────────

async function toolOwnTopAds(
  admin: AdminClient,
  workspaceId: string,
  platform = 'all',
  days = 30,
  limit = 5,
): Promise<string> {
  const { data: conns } = await admin
    .from('connections')
    .select('id, app_name, name, config, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .in('app_name', ['googleads', 'meta'])

  const connections: { app_name: string; name: string; config: Record<string, unknown> }[] = conns ?? []
  if (!connections.length) {
    return 'No ad platform accounts connected. Ask the user to connect their Google Ads or Meta Ads account in the Connections section.'
  }

  const filtered = platform === 'all' ? connections : connections.filter(c => {
    if (platform === 'google_ads') return c.app_name === 'googleads'
    if (platform === 'meta_ads') return c.app_name === 'meta'
    return c.app_name === platform
  })
  if (!filtered.length) return `No connected ${platform} account found.`

  const sections: string[] = []
  const cap = Math.min(limit, 10)

  for (const conn of filtered) {
    try {
      if (conn.app_name === 'googleads') {
        const customerId = conn.config?.customerId as string | undefined
        if (!customerId) { sections.push(`Google Ads (${conn.name}): No customer ID configured.`); continue }
        const ads = await getGoogleTopAds(workspaceId, customerId.replace(/-/g, ''), days, cap)
        if (!ads.length) {
          sections.push(`Google Ads (${conn.name}): No ad data.`)
          continue
        }
        const lines = ads.map((a, i) =>
          `  ${i + 1}. "${a.headline}" — ${a.campaignName} | ${a.clicks} clicks, CTR ${(a.ctr * 100).toFixed(2)}%, €${a.spend.toFixed(2)} spend, ${a.conversions} conv`
        )
        sections.push([`Google Ads top ${ads.length} ads — ${conn.name}:`, ...lines].join('\n'))

      } else if (conn.app_name === 'meta') {
        const accountId = conn.config?.accountId as string | undefined
        if (!accountId) { sections.push(`Meta Ads (${conn.name}): No account ID configured.`); continue }
        const ads = await getMetaTopAdsComposio(workspaceId, accountId, days, cap)
        if (!ads.length) {
          sections.push(`Meta Ads (${conn.name}): No ad data.`)
          continue
        }
        const lines = ads.map((a, i) =>
          `  ${i + 1}. "${a.adName}" — ${a.campaignName} | ${a.clicks} clicks, CTR ${(a.ctr * 100).toFixed(2)}%, $${a.spend.toFixed(2)} spend, ${a.conversions} conv`
        )
        sections.push([`Meta Ads top ${ads.length} ads — ${conn.name}:`, ...lines].join('\n'))
      }
    } catch (err) {
      sections.push(`${conn.app_name} (${conn.name}): Error — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return sections.join('\n\n') || 'No ad data found.'
}

// ─── Execute a tool call ──────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  admin: AdminClient,
  workspaceId: string,
  ownBrand: string,
  connectionId?: string,
): Promise<string> {
  try {
    switch (name) {
      case 'get_market_overview':
        return await toolMarketOverview(admin, workspaceId, connectionId, ownBrand)
      case 'get_brand_analysis':
        return await toolBrandAnalysis(admin, workspaceId, String(input.brand_name ?? ''), connectionId)
      case 'get_top_creatives':
        return await toolTopCreatives(admin, workspaceId,
          input.brand_name   ? String(input.brand_name)   : undefined,
          input.funnel_stage ? String(input.funnel_stage) : undefined,
          input.sort         ? String(input.sort)         : 'top',
          input.limit        ? Number(input.limit)        : 5,
          connectionId,
        )
      case 'get_whitespace_opportunities':
        return await toolWhitespace(admin, workspaceId, ownBrand, connectionId)
      case 'compare_brands':
        return await toolCompareBrands(admin, workspaceId, (input.brands as string[]) ?? [], connectionId)
      case 'get_own_campaign_performance':
        return await toolOwnCampaigns(admin, workspaceId,
          input.platform ? String(input.platform) : 'all',
          input.days     ? Number(input.days)     : 30,
        )
      case 'get_own_top_ads':
        return await toolOwnTopAds(admin, workspaceId,
          input.platform ? String(input.platform) : 'all',
          input.days     ? Number(input.days)     : 30,
          input.limit    ? Number(input.limit)    : 5,
        )
      default:
        return `Unknown tool: ${name}`
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ─── Agentic loop ─────────────────────────────────────────────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ClaudeContentBlock[]
}

interface ClaudeContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  text?: string
}

interface ClaudeResponse {
  stop_reason: 'end_turn' | 'tool_use' | string
  content: ClaudeContentBlock[]
}

async function runAgentLoop(
  userMessage: string,
  history: ClaudeMessage[],
  systemPrompt: string,
  apiKey: string,
  admin: AdminClient,
  workspaceId: string,
  ownBrand: string,
  connectionId: string | undefined,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const messages: ClaudeMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
  ]

  let iterations = 0
  const MAX_ITERATIONS = 6

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://cluezero.vercel.app',
        'X-Title':       'ClueZero Performance Agent',
      },
      body: JSON.stringify({
        model:      'anthropic/claude-sonnet-4-5',
        stream:     false,
        messages:   messages.map(m => ({
          role:    m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        tools:      TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })),
        max_tokens: 2048,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      onEvent({ type: 'error', message: `AI error: ${await res.text()}` })
      return
    }

    const data = await res.json()
    const choice = data.choices?.[0]
    const stopReason: string = choice?.finish_reason ?? 'stop'
    const rawContent = choice?.message?.content ?? ''
    const toolCalls = choice?.message?.tool_calls ?? []

    // If no tool calls → final answer
    if (!toolCalls.length || stopReason === 'stop') {
      onEvent({ type: 'text', text: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent) })
      onEvent({ type: 'done' })
      return
    }

    // Process tool calls
    const toolResults: ClaudeContentBlock[] = []

    for (const tc of toolCalls) {
      const toolName  = tc.function?.name ?? tc.name ?? 'unknown'
      let toolInput: Record<string, unknown> = {}
      try { toolInput = JSON.parse(tc.function?.arguments ?? '{}') } catch { /* ignore */ }

      onEvent({ type: 'tool_call', tool: toolName, input: toolInput })

      const result = await executeTool(toolName, toolInput, admin, workspaceId, ownBrand, connectionId)

      onEvent({ type: 'tool_result', tool: toolName, result: result.slice(0, 300) + (result.length > 300 ? '…' : '') })

      toolResults.push({
        type:        'tool_result',
        tool_use_id: tc.id ?? toolName,
        content:     result,
      })
    }

    // Add assistant turn with tool calls
    messages.push({
      role: 'assistant',
      content: JSON.stringify(toolCalls),
    })

    // Add tool results
    messages.push({
      role: 'user',
      content: JSON.stringify(toolResults),
    })
  }

  onEvent({ type: 'error', message: 'Agent reached maximum iterations without completing.' })
  onEvent({ type: 'done' })
}

// ─── Event types ──────────────────────────────────────────────────────────────

type AgentEvent =
  | { type: 'tool_call';   tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result: string }
  | { type: 'text';        text: string }
  | { type: 'error';       message: string }
  | { type: 'done' }

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { message, history = [], workspaceId, connectionId } = await req.json() as {
    message:      string
    history?:     ClaudeMessage[]
    workspaceId:  string
    connectionId?: string
  }
  if (!workspaceId || !message) return new Response('workspaceId and message required', { status: 400 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return new Response('AI not configured', { status: 503 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify membership + load profile
  const [{ data: membership }, { data: ws }] = await Promise.all([
    admin.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).single(),
    admin.from('workspaces').select('own_brand, company_name, industry, brand_description, target_audience').eq('id', workspaceId).single(),
  ])
  if (!membership) return new Response('Forbidden', { status: 403 })

  const ownBrand = ws?.own_brand ?? ''

  const clientName = ws?.company_name || ownBrand || 'the client'
  const brandName  = ownBrand || ws?.company_name || 'the client brand'

  const systemPrompt = [
    `You are a Performance Marketing Manager agent working exclusively for ${clientName}.`,
    ``,
    `═══ CLIENT CONTEXT (already known — NEVER ask the user for this) ═══`,
    `Client brand in the data: ${brandName}`,
    ws?.company_name   && `Company name: ${ws.company_name}`,
    ws?.industry       && `Industry: ${ws.industry}`,
    ws?.brand_description && `Brand description: ${ws.brand_description}`,
    ws?.target_audience   && `Target audience: ${ws.target_audience}`,
    ``,
    `═══ RULES ═══`,
    `- NEVER ask the user for their brand name, company name, or which brand they work for. You already know it (${brandName}).`,
    `- NEVER ask for clarification before using tools. Just call the right tool and use the data.`,
    `- Always call tools to get real data before answering. Never make up numbers.`,
    `- In tool calls, when filtering by own brand, use "${brandName}" as the brand_name parameter.`,
    `- Frame all insights from ${clientName}'s perspective — they are your client, not a competitor.`,
    `- When you have the data you need, give a direct answer with specific numbers and actionable recommendations.`,
    `- Use **bold** for key metrics and brand names. Use bullet points for lists of insights.`,
    `- Be concise but thorough.`,
  ].filter(Boolean).join('\n')

  // Stream events back as NDJSON
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      function send(event: AgentEvent) {
        controller.enqueue(enc.encode(JSON.stringify(event) + '\n'))
      }

      await runAgentLoop(
        message, history, systemPrompt, apiKey,
        admin, workspaceId, ownBrand, connectionId,
        send,
      )
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':     'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control':    'no-cache',
    },
  })
}
