// POST /api/agents/performance/brief — v2
// Gathers competitive + own-account data, asks Claude to synthesize into a structured brief.
// Returns PerformanceBrief JSON — no streaming, no agent loop.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { refreshGoogleToken, getCampaignPerformance as getGoogleCampaigns } from '@/lib/google-ads'
import { getMetaCampaignPerformance } from '@/lib/meta-ads'

export const runtime = 'nodejs'
export const maxDuration = 60

// ─── Output schema ─────────────────────────────────────────────────────────────

export interface PerformanceBrief {
  generatedAt: string
  accountHealth: {
    hasConnectedAccounts: boolean
    totalSpend: number
    currency: string
    roas: number | null
    clicks: number
    conversions: number
    topCampaign: string | null
    platforms: { name: string; spend: number; campaigns: number }[]
    summary: string
  }
  marketPosition: {
    spendRank: number | null
    totalBrands: number
    spendShare: number | null
    weeklySpend: number | null
    piScore: number | null
    marketAvgPi: number | null
    wowChange: string | null
    competitors: { name: string; share: number; pi: number | null; newAds: number }[]
  }
  opportunities: {
    title: string
    description: string
    type: 'funnel' | 'platform' | 'topic' | 'budget'
  }[]
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    title: string
    rationale: string
    action: string
  }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any

function countBy<T>(arr: T[], key: (v: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of arr) { const k = key(v); out[k] = (out[k] ?? 0) + 1 }
  return out
}

function avgPi(scores: number[]): number | null {
  return scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null
}

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().slice(0, 10)
}

// ─── Gather competitive data ──────────────────────────────────────────────────

async function gatherCompetitiveData(admin: AdminClient, workspaceId: string, connectionId?: string, ownBrand?: string) {
  let q = admin
    .from('ads')
    .select(`id, first_seen_at, performance_index, topic, platform, is_active,
      tracked_brands ( name, is_own_brand ),
      ad_spend_estimates ( week_start, est_spend_eur ),
      ad_enrichments ( funnel_stage )`)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
  if (connectionId) q = q.eq('connection_id', connectionId)
  const { data: rows } = await q
  if (!rows?.length) return null

  const allWeeks = new Set<string>()
  const byBrand: Record<string, {
    name: string; isOwn: boolean
    totalAds: number; newAdsThisWeek: number
    latestSpend: number; prevSpend: number
    piScores: number[]; funnelStages: string[]; topics: string[]; platforms: string[]
  }> = {}

  for (const ad of rows) {
    const name  = ad.tracked_brands?.name ?? 'Unknown'
    const isOwn = ad.tracked_brands?.is_own_brand ?? false
    if (!byBrand[name]) {
      byBrand[name] = { name, isOwn, totalAds: 0, newAdsThisWeek: 0, latestSpend: 0, prevSpend: 0, piScores: [], funnelStages: [], topics: [], platforms: [] }
    }
    const b = byBrand[name]
    b.totalAds++
    if (ad.performance_index != null) b.piScores.push(Number(ad.performance_index))
    if (ad.topic)    b.topics.push(ad.topic)
    if (ad.platform) b.platforms.push(ad.platform)

    // Supabase returns related rows as object (single) or array — normalise both
    const enrichArr: { funnel_stage: string | null }[] = Array.isArray(ad.ad_enrichments)
      ? ad.ad_enrichments
      : ad.ad_enrichments ? [ad.ad_enrichments] : []
    const spendArr: { week_start: string; est_spend_eur: number | null }[] = Array.isArray(ad.ad_spend_estimates)
      ? ad.ad_spend_estimates
      : ad.ad_spend_estimates ? [ad.ad_spend_estimates] : []

    for (const e   of enrichArr) if (e.funnel_stage) b.funnelStages.push(e.funnel_stage)
    for (const est of spendArr)  allWeeks.add(est.week_start)
  }

  const sortedWeeks  = [...allWeeks].sort()
  const latestWeek   = sortedWeeks[sortedWeeks.length - 1]
  const prevWeek     = sortedWeeks[sortedWeeks.length - 2]

  for (const ad of rows) {
    const name     = ad.tracked_brands?.name ?? 'Unknown'
    const spendArr2: { week_start: string; est_spend_eur: number | null }[] = Array.isArray(ad.ad_spend_estimates)
      ? ad.ad_spend_estimates
      : ad.ad_spend_estimates ? [ad.ad_spend_estimates] : []
    for (const est of spendArr2) {
      if (est.week_start === latestWeek) byBrand[name].latestSpend += Number(est.est_spend_eur ?? 0)
      if (prevWeek && est.week_start === prevWeek) byBrand[name].prevSpend += Number(est.est_spend_eur ?? 0)
    }
    if (getWeekStart(ad.first_seen_at) === latestWeek) byBrand[name].newAdsThisWeek++
  }

  const totalSpend = Object.values(byBrand).reduce((s, b) => s + b.latestSpend, 0)
  const brands = Object.values(byBrand).sort((a, b) => b.latestSpend - a.latestSpend)

  // Own brand
  const ownEntry = brands.find(b => b.isOwn || (ownBrand && b.name.toLowerCase().includes(ownBrand.toLowerCase())))
  const ownIdx   = ownEntry ? brands.indexOf(ownEntry) + 1 : null

  // Funnel gaps
  const allFunnel = rows.flatMap((r: { ad_enrichments: unknown }) => {
    const enrichArr = Array.isArray(r.ad_enrichments) ? r.ad_enrichments : (r.ad_enrichments ? [r.ad_enrichments] : [])
    return (enrichArr as { funnel_stage: string | null }[]).map(e => e.funnel_stage).filter(Boolean) as string[]
  })
  const funnelCounts   = countBy(allFunnel, (s: string) => s)
  const funnelLow      = Object.entries(funnelCounts).filter(([, c]) => c / Math.max(allFunnel.length, 1) < 0.1).map(([s]) => s)
  const ownFunnelCounts = ownEntry ? countBy(ownEntry.funnelStages, (s: string) => s) : {}
  const missingFunnel  = ['See', 'Think', 'Do', 'Care'].filter(f => !ownFunnelCounts[f] || ownFunnelCounts[f] < 2)

  const allPlatforms   = (rows.map((r: { platform: string | null }) => r.platform ?? '').filter(Boolean)) as string[]
  const platformCounts = countBy(allPlatforms, (p: string) => p)
  const ownPlatCounts  = ownEntry ? countBy(ownEntry.platforms, (p: string) => p) : {}
  const missingPlat    = Object.keys(platformCounts).filter(p => !ownPlatCounts[p] || ownPlatCounts[p] < 2)

  const allTopics   = (rows.map((r: { topic: string | null }) => r.topic ?? '').filter(Boolean)) as string[]
  const topicCounts = countBy(allTopics, (t: string) => t)
  const lowTopics   = Object.entries(topicCounts).filter(([, c]) => c < 3).map(([t]) => t).slice(0, 3)

  const wowChange = ownEntry && ownEntry.latestSpend > 0 && ownEntry.prevSpend > 0
    ? ((ownEntry.latestSpend - ownEntry.prevSpend) / ownEntry.prevSpend * 100).toFixed(0) + '%'
    : null

  return {
    brands,
    totalSpend,
    ownEntry,
    ownIdx,
    latestWeek,
    marketAvgPi: avgPi(brands.flatMap(b => b.piScores)),
    funnelLow,
    missingFunnel,
    missingPlat,
    lowTopics,
    wowChange,
    marketPosition: {
      spendRank:   ownIdx,
      totalBrands: brands.length,
      spendShare:  ownEntry && totalSpend > 0 ? parseFloat((ownEntry.latestSpend / totalSpend * 100).toFixed(1)) : null,
      weeklySpend: ownEntry?.latestSpend ?? null,
      piScore:     ownEntry ? avgPi(ownEntry.piScores) : null,
      marketAvgPi: avgPi(brands.flatMap(b => b.piScores)),
      wowChange,
      competitors: brands
        .filter(b => !b.isOwn && !(ownBrand && b.name.toLowerCase().includes(ownBrand.toLowerCase())))
        .slice(0, 5)
        .map(b => ({
          name:    b.name,
          share:   totalSpend > 0 ? parseFloat((b.latestSpend / totalSpend * 100).toFixed(1)) : 0,
          pi:      avgPi(b.piScores),
          newAds:  b.newAdsThisWeek,
        })),
    },
  }
}

// ─── Gather own ad account data ───────────────────────────────────────────────

async function gatherAdAccountData(admin: AdminClient, workspaceId: string) {
  const { data: conns } = await admin
    .from('ad_platform_connections')
    .select('id, platform, account_id, account_name, access_token, refresh_token, token_expires_at, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (!conns?.length) return null

  let totalSpend = 0, totalClicks = 0, totalConversions = 0, totalConvValue = 0
  let topCampaign: string | null = null
  const platforms: { name: string; spend: number; campaigns: number }[] = []

  for (const conn of conns) {
    try {
      let token = conn.access_token
      if (conn.platform === 'google_ads' && conn.refresh_token) {
        const exp = conn.token_expires_at ? new Date(conn.token_expires_at) : null
        if (!exp || exp < new Date(Date.now() + 5 * 60 * 1000)) {
          const refreshed = await refreshGoogleToken(conn.refresh_token)
          if (refreshed) {
            token = refreshed.accessToken
            await admin.from('ad_platform_connections').update({ access_token: refreshed.accessToken, token_expires_at: refreshed.expiresAt }).eq('id', conn.id)
          }
        }
      }

      if (conn.platform === 'google_ads') {
        const campaigns = await getGoogleCampaigns(conn.account_id.replace(/-/g, ''), token, 30)
        const spend = campaigns.reduce((s, c) => s + c.spend, 0)
        totalSpend       += spend
        totalClicks      += campaigns.reduce((s, c) => s + c.clicks, 0)
        totalConversions += campaigns.reduce((s, c) => s + c.conversions, 0)
        totalConvValue   += campaigns.reduce((s, c) => s + c.conversionValue, 0)
        platforms.push({ name: 'Google Ads', spend, campaigns: campaigns.length })
        const top = campaigns.sort((a, b) => b.spend - a.spend)[0]
        if (top && (!topCampaign || top.spend > totalSpend * 0.4)) topCampaign = top.campaignName

      } else if (conn.platform === 'meta_ads') {
        const campaigns = await getMetaCampaignPerformance(conn.account_id, token, 30)
        const spend = campaigns.reduce((s, c) => s + c.spend, 0)
        totalSpend       += spend
        totalClicks      += campaigns.reduce((s, c) => s + c.clicks, 0)
        totalConversions += campaigns.reduce((s, c) => s + c.conversions, 0)
        totalConvValue   += campaigns.reduce((s, c) => s + c.conversionValue, 0)
        platforms.push({ name: 'Meta Ads', spend, campaigns: campaigns.length })
        const top = campaigns.sort((a, b) => b.spend - a.spend)[0]
        if (top && !topCampaign) topCampaign = top.campaignName
      }
    } catch { /* skip failed accounts */ }
  }

  return {
    hasConnectedAccounts: true,
    totalSpend,
    currency: 'EUR',
    roas: totalConvValue > 0 && totalSpend > 0 ? parseFloat((totalConvValue / totalSpend).toFixed(2)) : null,
    clicks: totalClicks,
    conversions: totalConversions,
    topCampaign,
    platforms,
  }
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, connectionId } = await req.json() as { workspaceId: string; connectionId?: string }
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const [{ data: membership }, { data: ws }] = await Promise.all([
    admin.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).single(),
    admin.from('workspaces').select('own_brand, company_name, industry').eq('id', workspaceId).single(),
  ])
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ownBrand = ws?.own_brand ?? ws?.company_name ?? ''

  // Gather data in parallel
  const [competitive, adAccount] = await Promise.all([
    gatherCompetitiveData(admin, workspaceId, connectionId, ownBrand),
    gatherAdAccountData(admin, workspaceId),
  ])

  // Build context string for Claude
  const ctxLines: string[] = [
    `Brand: ${ownBrand || 'Unknown'}`,
    ...(ws?.industry ? [`Industry: ${ws.industry}`] : []),
    '',
    '── OWN AD ACCOUNT (last 30 days) ──',
    ...(adAccount
      ? [
          `Spend: €${adAccount.totalSpend.toFixed(2)}, ROAS: ${adAccount.roas ?? 'N/A'}, Clicks: ${adAccount.clicks}, Conversions: ${adAccount.conversions}`,
          `Platforms: ${adAccount.platforms.map(p => `${p.name} €${p.spend.toFixed(2)} (${p.campaigns} campaigns)`).join(', ')}`,
          `Top campaign: ${adAccount.topCampaign ?? 'N/A'}`,
        ]
      : ['No ad accounts connected.']),
    '',
    '── COMPETITIVE MARKET ──',
    ...(competitive
      ? [
          `Own brand rank: #${competitive.ownIdx ?? '?'} of ${competitive.brands.length} brands`,
          `Spend share: ${competitive.marketPosition.spendShare ?? '?'}%`,
          `Weekly spend: €${Math.round(competitive.ownEntry?.latestSpend ?? 0).toLocaleString()}`,
          `PI score: ${competitive.marketPosition.piScore ?? 'N/A'} (market avg: ${competitive.marketPosition.marketAvgPi ?? 'N/A'})`,
          `WoW change: ${competitive.wowChange ?? 'N/A'}`,
          '',
          'Competitors:',
          ...competitive.marketPosition.competitors.map(c =>
            `  - ${c.name}: ${c.share}% share, PI ${c.pi ?? 'N/A'}, ${c.newAds} new ads this week`
          ),
          '',
          `Funnel gaps (market underserved): ${competitive.funnelLow.join(', ') || 'none'}`,
          `Brand missing funnel stages: ${competitive.missingFunnel.join(', ') || 'none'}`,
          `Brand missing platforms: ${competitive.missingPlat.join(', ') || 'none'}`,
          `Low-competition topics: ${competitive.lowTopics.join(', ') || 'none'}`,
        ]
      : ['No competitive data available. User needs to sync their data source.']),
  ]
  const ctx = ctxLines.filter(l => l !== undefined).join('\n')

  // Ask Claude for structured brief
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://cluezero.vercel.app',
      'X-Title': 'ClueZero Performance Brief',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `You are a Performance Marketing Manager generating a structured weekly brief. Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "accountHealth": {
    "summary": "1-2 sentence plain-English summary of own account health",
    "totalSpend": <number>,
    "currency": "<string>",
    "roas": <number|null>,
    "clicks": <number>,
    "conversions": <number>,
    "topCampaign": "<string|null>",
    "platforms": [{"name":"<string>","spend":<number>,"campaigns":<number>}],
    "hasConnectedAccounts": <boolean>
  },
  "marketPosition": {
    "spendRank": <number|null>,
    "totalBrands": <number>,
    "spendShare": <number|null>,
    "weeklySpend": <number|null>,
    "piScore": <number|null>,
    "marketAvgPi": <number|null>,
    "wowChange": "<string|null>",
    "competitors": [{"name":"<string>","share":<number>,"pi":<number|null>,"newAds":<number>}]
  },
  "opportunities": [
    {"title":"<string>","description":"<string>","type":"funnel|platform|topic|budget"}
  ],
  "recommendations": [
    {"priority":"high|medium|low","title":"<string>","rationale":"<string>","action":"<string>"}
  ]
}`,
        },
        {
          role: 'user',
          content: `Generate a performance brief from this data:\n\n${ctx}`,
        },
      ],
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'AI error' }, { status: 502 })

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? ''

  let brief: Omit<PerformanceBrief, 'generatedAt'>
  try {
    // Extract JSON object — strip markdown fences and any text outside the braces
    const first = raw.indexOf('{')
    const last  = raw.lastIndexOf('}')
    if (first === -1 || last === -1) throw new Error('No JSON object in response')
    brief = JSON.parse(raw.slice(first, last + 1))
  } catch (parseErr) {
    console.error('Brief parse error:', parseErr, '\nRaw response:', raw?.slice(0, 500))
    return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 })
  }

  // Merge in raw numbers (override Claude's values with real ones for reliability)
  if (adAccount) {
    brief.accountHealth.totalSpend   = adAccount.totalSpend
    brief.accountHealth.roas         = adAccount.roas
    brief.accountHealth.clicks       = adAccount.clicks
    brief.accountHealth.conversions  = adAccount.conversions
    brief.accountHealth.topCampaign  = adAccount.topCampaign
    brief.accountHealth.platforms    = adAccount.platforms
    brief.accountHealth.hasConnectedAccounts = true
  } else {
    brief.accountHealth.hasConnectedAccounts = false
  }
  if (competitive) {
    Object.assign(brief.marketPosition, competitive.marketPosition)
  }

  return NextResponse.json({ ...brief, generatedAt: new Date().toISOString() } satisfies PerformanceBrief)
}
