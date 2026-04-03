import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 120

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrategyContext {
  positioning:       string
  goal:              string
  primaryCompetitor: string
  budgetContext:     string
  focusAreas:        string
  notes:             string
}

// ─── Reuse data-context builder from ai/chat ─────────────────────────────────

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

function brandKey(name: string) {
  const n = name.toLowerCase().replace(/[\s\-_]/g, '')
  if (n.includes('orlen'))    return 'orlen'
  if (n.includes('aral'))     return 'aral'
  if (n.includes('circlek') || n.includes('circle')) return 'circleK'
  if (n === 'eni' || n.startsWith('eni')) return 'eni'
  if (n.includes('esso'))     return 'esso'
  if (n.includes('shell'))    return 'shell'
  return n
}

async function buildDataContext(workspaceId: string, ownBrand: string, connectionId?: string) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let adsQuery = admin
    .from('ads')
    .select(`id, first_seen_at, performance_index, topic, headline,
      tracked_brands ( name ),
      ad_spend_estimates ( week_start, est_spend_eur, est_reach ),
      ad_enrichments ( funnel_stage )`)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
  if (connectionId) adsQuery = adsQuery.eq('connection_id', connectionId)

  const { data: rows } = await adsQuery
  if (!rows || rows.length === 0) return null

  const byBrand: Record<string, {
    name: string; totalAds: number; newAdsThisWeek: number
    totalSpend: number; latestWeekSpend: number; prevWeekSpend: number
    piScores: number[]; topics: string[]; funnelStages: string[]
    recentHeadlines: Array<{ headline: string; first_seen_at: string }>
  }> = {}

  const allWeekStarts = new Set<string>()

  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    if (!byBrand[key]) {
      byBrand[key] = { name: rawName, totalAds: 0, newAdsThisWeek: 0, totalSpend: 0, latestWeekSpend: 0, prevWeekSpend: 0, piScores: [], topics: [], funnelStages: [], recentHeadlines: [] }
    }
    byBrand[key].totalAds++
    if (ad.performance_index != null) byBrand[key].piScores.push(Number(ad.performance_index))
    if (ad.topic) byBrand[key].topics.push(String(ad.topic))
    const hl = (ad as unknown as { headline?: string }).headline
    if (hl) byBrand[key].recentHeadlines.push({ headline: hl, first_seen_at: ad.first_seen_at })

    for (const e of (Array.isArray(ad.ad_enrichments) ? ad.ad_enrichments : [])) {
      if (e.funnel_stage) byBrand[key].funnelStages.push(e.funnel_stage)
    }
    for (const est of (Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : [])) {
      allWeekStarts.add(est.week_start)
      byBrand[key].totalSpend += Number(est.est_spend_eur ?? 0)
    }
  }

  const sortedWeeks = [...allWeekStarts].sort()
  const latestWeek = sortedWeeks[sortedWeeks.length - 1]
  const prevWeek   = sortedWeeks[sortedWeeks.length - 2]

  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    for (const est of (Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : [])) {
      if (est.week_start === latestWeek)  byBrand[key].latestWeekSpend += Number(est.est_spend_eur ?? 0)
      if (prevWeek && est.week_start === prevWeek) byBrand[key].prevWeekSpend += Number(est.est_spend_eur ?? 0)
    }
  }
  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    if (getWeekStart(ad.first_seen_at) === latestWeek) byBrand[key].newAdsThisWeek++
  }

  const totalLatestSpend = Object.values(byBrand).reduce((s, b) => s + b.latestWeekSpend, 0)
  const ownKey = Object.keys(byBrand).find(k =>
    k.toLowerCase().includes(ownBrand.toLowerCase().replace(/[\s\-_]/g, ''))
  ) ?? Object.keys(byBrand)[0]

  const brandLines = Object.entries(byBrand)
    .sort((a, b) => b[1].latestWeekSpend - a[1].latestWeekSpend)
    .map(([, b]) => {
      const share = totalLatestSpend > 0 ? ((b.latestWeekSpend / totalLatestSpend) * 100).toFixed(1) : '0'
      const avgPi = b.piScores.length > 0 ? Math.round(b.piScores.reduce((s, v) => s + v, 0) / b.piScores.length) : null

      let spendChangePct = 'N/A'
      if (b.latestWeekSpend > 0 && b.prevWeekSpend > 0) {
        const pct = ((b.latestWeekSpend - b.prevWeekSpend) / b.prevWeekSpend) * 100
        spendChangePct = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%'
      }

      let funnelDist = 'N/A'
      if (b.funnelStages.length > 0) {
        const counts: Record<string, number> = {}
        for (const s of b.funnelStages) counts[s] = (counts[s] ?? 0) + 1
        funnelDist = Object.entries(counts).sort((a, b) => b[1] - a[1])
          .map(([s, c]) => `${s} ${Math.round((c / b.funnelStages.length) * 100)}%`).join(', ')
      }

      const headlines = [...b.recentHeadlines]
        .sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime())
        .slice(0, 3).map(h => `"${h.headline}"`).join('; ') || 'N/A'

      const topicCounts: Record<string, number> = {}
      for (const t of b.topics) topicCounts[t] = (topicCounts[t] ?? 0) + 1
      const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])
        .slice(0, 3).map(([t]) => t).join(', ') || 'N/A'

      return `- ${b.name}: ${b.totalAds} active ads, ${b.newAdsThisWeek} new this week, est. weekly spend €${Math.round(b.latestWeekSpend).toLocaleString()} (${share}% share, WoW ${spendChangePct}), PI ${avgPi ?? 'N/A'}, funnel: ${funnelDist}, top topics: ${topTopics}, recent headlines: ${headlines}`
    }).join('\n')

  return {
    latestWeekLabel: latestWeek ? new Date(latestWeek).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
    totalWeeks: sortedWeeks.length,
    totalLatestSpend: Math.round(totalLatestSpend),
    brandCount: Object.keys(byBrand).length,
    ownBrandName: byBrand[ownKey]?.name ?? ownBrand,
    ownBrandData: byBrand[ownKey],
    allBrandData: byBrand,
    brandLines,
  }
}

// ─── Build strategy prompt ────────────────────────────────────────────────────

function buildStrategyPrompt(
  ctx: NonNullable<Awaited<ReturnType<typeof buildDataContext>>>,
  profile: { companyName: string; industry: string; targetAudience: string; brandDescription: string; ownBrand: string },
  strategyCtx: StrategyContext,
): string {
  const brandLabel = profile.ownBrand || ctx.ownBrandName

  const ownData = ctx.ownBrandData
  const ownShare = ctx.totalLatestSpend > 0 && ownData
    ? ((ownData.latestWeekSpend / ctx.totalLatestSpend) * 100).toFixed(1)
    : null
  const ownPi = ownData?.piScores?.length
    ? Math.round(ownData.piScores.reduce((s, v) => s + v, 0) / ownData.piScores.length)
    : null
  const marketAvgPi = Object.values(ctx.allBrandData).flatMap(b => b.piScores)
  const marketPiAvg = marketAvgPi.length
    ? Math.round(marketAvgPi.reduce((s, v) => s + v, 0) / marketAvgPi.length)
    : null

  const contextBlock = [
    profile.companyName    && `Company: ${profile.companyName}`,
    profile.industry       && `Industry: ${profile.industry}`,
    profile.targetAudience && `Target audience: ${profile.targetAudience}`,
    profile.brandDescription && `Brand: ${profile.brandDescription}`,
    strategyCtx.positioning && `Positioning: ${strategyCtx.positioning}`,
    strategyCtx.goal       && `Strategic goal: ${strategyCtx.goal}`,
    strategyCtx.primaryCompetitor && `Primary competitor to beat: ${strategyCtx.primaryCompetitor}`,
    strategyCtx.budgetContext && `Budget context: ${strategyCtx.budgetContext}`,
    strategyCtx.focusAreas && `Focus areas: ${strategyCtx.focusAreas}`,
    strategyCtx.notes      && `Agent notes: ${strategyCtx.notes}`,
  ].filter(Boolean).join('\n')

  return `You are a senior competitive intelligence strategist. Based on real ad market data, generate a structured strategic brief for the brand described below.

═══ BRAND CONTEXT ═══
Own brand: ${brandLabel}
${contextBlock || `No additional context provided — infer from the data.`}

═══ MARKET DATA (week of ${ctx.latestWeekLabel}) ═══
Total estimated market weekly spend: €${ctx.totalLatestSpend.toLocaleString()}
Tracked brands: ${ctx.brandCount}
Weeks of history: ${ctx.totalWeeks}
${ownShare ? `${brandLabel} current spend share: ${ownShare}%` : ''}
${ownPi ? `${brandLabel} avg Performance Index: ${ownPi}` : ''}
${marketPiAvg ? `Market avg Performance Index: ${marketPiAvg}` : ''}

BRAND-BY-BRAND BREAKDOWN:
(each line: active ads · new this week · est. weekly spend · share · WoW change · PI · funnel mix · topics · recent headlines)
${ctx.brandLines}

═══ OUTPUT FORMAT ═══
Respond with ONLY a valid JSON object. No markdown, no prose outside the JSON.

{
  "summary": "2–4 sentences summarising the competitive landscape and ${brandLabel}'s position this week. Include specific numbers.",
  "stats": [
    { "label": "Share", "value": "XX.X%", "delta": "+X.X pts", "up": true },
    { "label": "PI Score", "value": "XX", "delta": "+X vs market", "up": true },
    { "label": "New Ads", "value": "X", "delta": "+XX%", "up": true }
  ],
  "threats": [
    {
      "brand": "CompetitorName",
      "severity": "high",
      "title": "Short threat headline",
      "detail": "2–3 sentences with specific data points explaining why this is a threat to ${brandLabel}."
    }
  ],
  "opportunities": [
    {
      "title": "Short opportunity headline",
      "detail": "2–3 sentences explaining the opportunity with specific data to back it up.",
      "potential": "high",
      "channel": "Meta"
    }
  ],
  "recommendations": [
    {
      "priority": "critical",
      "title": "Concise action title",
      "reasoning": "1–2 sentences explaining why this matters NOW based on the data.",
      "action": "Specific, tactical action ${brandLabel} should take. Include channels, formats, targeting, or budget direction.",
      "confidence": 85,
      "timeframe": "This week",
      "effort": "medium"
    }
  ],
  "watchList": [
    {
      "brand": "CompetitorName",
      "signal": "One-sentence description of what to watch and why",
      "trend": "up"
    }
  ]
}

RULES:
- Use only data from the market snapshot above — never invent numbers
- stats.value and stats.delta must be derived from the actual data
- threats: 2–4 items, ordered by severity (high first)
- opportunities: 2–4 items ordered by potential
- recommendations: 3–6 items ordered by priority (critical first)
- watchList: 3–5 competitors to monitor next week
- Confidence scores: 80–95% = data-backed, 65–79% = pattern-based, below 65% = speculative
- timeframe options: "This week" | "Next 2 weeks" | "Within 3 weeks" | "Next 4 weeks"
- effort options: "low" | "medium" | "high"
- priority options: "critical" | "high" | "medium" | "low"
- potential/severity options: "high" | "medium" | "low"
- trend options: "up" | "down" | "flat"`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, connectionId } = await req.json() as {
    workspaceId: string
    connectionId?: string
  }
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Auth check
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Load workspace profile + strategy context in parallel with data context
  const [wsData, ctx] = await Promise.all([
    admin.from('workspaces')
      .select('own_brand, company_name, industry, website, brand_description, target_audience, strategy_context')
      .eq('id', workspaceId)
      .single()
      .then(r => r.data),
    buildDataContext(workspaceId, '', connectionId),
  ])

  const profile = {
    ownBrand:          wsData?.own_brand          ?? '',
    companyName:       wsData?.company_name       ?? '',
    industry:          wsData?.industry           ?? '',
    website:           wsData?.website            ?? '',
    brandDescription:  wsData?.brand_description  ?? '',
    targetAudience:    wsData?.target_audience    ?? '',
  }

  const strategyCtx: StrategyContext = {
    positioning:       (wsData?.strategy_context as StrategyContext)?.positioning       ?? '',
    goal:              (wsData?.strategy_context as StrategyContext)?.goal              ?? '',
    primaryCompetitor: (wsData?.strategy_context as StrategyContext)?.primaryCompetitor ?? '',
    budgetContext:     (wsData?.strategy_context as StrategyContext)?.budgetContext      ?? '',
    focusAreas:        (wsData?.strategy_context as StrategyContext)?.focusAreas        ?? '',
    notes:             (wsData?.strategy_context as StrategyContext)?.notes             ?? '',
  }

  if (!ctx) {
    return NextResponse.json({ error: 'No ad data synced yet. Please sync your Snowflake connection first.' }, { status: 422 })
  }

  // Override ownBrandName with profile if set
  if (profile.ownBrand) ctx.ownBrandName = profile.ownBrand

  const systemPrompt = buildStrategyPrompt(ctx, profile, strategyCtx)

  // Call OpenRouter — non-streaming, structured JSON output
  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${apiKey}`,
      'Content-Type':   'application/json',
      'HTTP-Referer':   'https://cluezero.vercel.app',
      'X-Title':        'ClueZero Strategy Agent',
    },
    body: JSON.stringify({
      model:       'anthropic/claude-sonnet-4-5',
      stream:      false,
      messages:    [{ role: 'user', content: systemPrompt }],
      max_tokens:  4096,
      temperature: 0.3,
    }),
  })

  if (!aiRes.ok) {
    const err = await aiRes.text()
    return NextResponse.json({ error: `AI error: ${err}` }, { status: 502 })
  }

  const aiJson = await aiRes.json()
  const rawContent: string = aiJson.choices?.[0]?.message?.content ?? ''

  // Extract JSON — strip any markdown fences Claude might add
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'AI returned unparseable response', raw: rawContent }, { status: 502 })
  }

  let brief: Record<string, unknown>
  try {
    brief = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'AI response was not valid JSON', raw: rawContent }, { status: 502 })
  }

  // Persist to strategy_briefs
  const recCount = Array.isArray(brief.recommendations) ? (brief.recommendations as unknown[]).length : 0
  const { data: savedBrief, error: saveError } = await admin
    .from('strategy_briefs')
    .insert({
      workspace_id:  workspaceId,
      week_label:    ctx.latestWeekLabel,
      brief_json:    brief,
      rec_count:     recCount,
    })
    .select('id, generated_at, week_label, rec_count')
    .single()

  if (saveError) {
    console.error('Failed to save strategy brief:', saveError)
    // Return brief anyway even if save fails
    return NextResponse.json({ brief, weekLabel: ctx.latestWeekLabel })
  }

  return NextResponse.json({
    brief,
    briefId:      savedBrief.id,
    generatedAt:  savedBrief.generated_at,
    weekLabel:    ctx.latestWeekLabel,
  })
}
