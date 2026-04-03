import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Build data context from Supabase ────────────────────────────────────────

async function buildDataContext(workspaceId: string, ownBrand: string, connectionId?: string) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  function brandKey(name: string) {
    const n = name.toLowerCase().replace(/[\s\-_]/g, '')
    if (n.includes('orlen')) return 'orlen'
    if (n.includes('aral')) return 'aral'
    if (n.includes('circlek') || n.includes('circle')) return 'circleK'
    if (n === 'eni' || n.startsWith('eni')) return 'eni'
    if (n.includes('esso')) return 'esso'
    if (n.includes('shell')) return 'shell'
    return n
  }

  function getWeekStart(dateStr: string) {
    const d = new Date(dateStr)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setUTCDate(diff)
    return monday.toISOString().slice(0, 10)
  }

  // Fetch ads with spend + enrichments
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

  // Aggregate by brand
  const byBrand: Record<string, {
    name: string
    totalAds: number
    newAdsThisWeek: number
    totalSpend: number
    latestWeekSpend: number
    prevWeekSpend: number
    avgPi: number | null
    piScores: number[]
    topics: string[]
    funnelStages: string[]
    platforms: string[]
    recentHeadlines: Array<{ headline: string; first_seen_at: string }>
  }> = {}

  const allWeekStarts = new Set<string>()

  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    if (!byBrand[key]) {
      byBrand[key] = { name: rawName, totalAds: 0, newAdsThisWeek: 0, totalSpend: 0, latestWeekSpend: 0, prevWeekSpend: 0, avgPi: null, piScores: [], topics: [], funnelStages: [], platforms: [], recentHeadlines: [] }
    }
    byBrand[key].totalAds++
    if (ad.performance_index != null) byBrand[key].piScores.push(Number(ad.performance_index))
    if (ad.topic) byBrand[key].topics.push(String(ad.topic))
    if ((ad as unknown as { headline?: string }).headline) {
      byBrand[key].recentHeadlines.push({ headline: (ad as unknown as { headline: string }).headline, first_seen_at: ad.first_seen_at })
    }

    const enrichments = Array.isArray(ad.ad_enrichments) ? ad.ad_enrichments : []
    for (const e of enrichments) {
      if (e.funnel_stage) byBrand[key].funnelStages.push(e.funnel_stage)
    }

    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []
    for (const est of estimates) {
      allWeekStarts.add(est.week_start)
      byBrand[key].totalSpend += Number(est.est_spend_eur ?? 0)
    }
  }

  const sortedWeeks = [...allWeekStarts].sort()
  const latestWeek = sortedWeeks[sortedWeeks.length - 1]
  const prevWeek = sortedWeeks[sortedWeeks.length - 2]

  // Recalculate latest week spend and prev week spend per brand
  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []
    for (const est of estimates) {
      if (est.week_start === latestWeek) {
        byBrand[key].latestWeekSpend += Number(est.est_spend_eur ?? 0)
      }
      if (prevWeek && est.week_start === prevWeek) {
        byBrand[key].prevWeekSpend += Number(est.est_spend_eur ?? 0)
      }
    }
  }

  // Count new ads per brand for latest week
  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    const weekStart = getWeekStart(ad.first_seen_at)
    if (weekStart === latestWeek) byBrand[key].newAdsThisWeek++
  }

  // Finalise avgPi
  for (const key of Object.keys(byBrand)) {
    const scores = byBrand[key].piScores
    byBrand[key].avgPi = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10
      : null
  }

  const totalLatestSpend = Object.values(byBrand).reduce((s, b) => s + b.latestWeekSpend, 0)
  const ownKey = Object.keys(byBrand).find(k => k.toLowerCase().includes(ownBrand.toLowerCase().replace(/[\s\-_]/g, ''))) ?? Object.keys(byBrand)[0]

  // Build readable summary lines per brand
  const brandLines = Object.entries(byBrand)
    .sort((a, b) => b[1].latestWeekSpend - a[1].latestWeekSpend)
    .map(([, b]) => {
      const share = totalLatestSpend > 0 ? ((b.latestWeekSpend / totalLatestSpend) * 100).toFixed(1) : '0'

      // WoW spend change
      let spendChangePct = 'N/A'
      if (b.latestWeekSpend > 0 && b.prevWeekSpend > 0) {
        const pct = ((b.latestWeekSpend - b.prevWeekSpend) / b.prevWeekSpend) * 100
        spendChangePct = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%'
      }

      // Funnel distribution
      let funnelDist = 'N/A'
      if (b.funnelStages.length > 0) {
        const funnelCounts: Record<string, number> = {}
        for (const s of b.funnelStages) funnelCounts[s] = (funnelCounts[s] ?? 0) + 1
        funnelDist = Object.entries(funnelCounts)
          .sort((a2, b2) => b2[1] - a2[1])
          .map(([stage, count]) => `${stage} ${Math.round((count / b.funnelStages.length) * 100)}%`)
          .join(', ')
      }

      // Top 3 recent headlines
      const sortedHeadlines = [...b.recentHeadlines]
        .sort((a2, b2) => new Date(b2.first_seen_at).getTime() - new Date(a2.first_seen_at).getTime())
        .slice(0, 3)
        .map(h => `"${h.headline}"`)
      const headlinesStr = sortedHeadlines.length > 0 ? sortedHeadlines.join('; ') : 'N/A'

      // Top 3 topics by count
      const topicCounts: Record<string, number> = {}
      for (const t of b.topics) topicCounts[t] = (topicCounts[t] ?? 0) + 1
      const topTopics = Object.entries(topicCounts)
        .sort((a2, b2) => b2[1] - a2[1])
        .slice(0, 3)
        .map(([t]) => t)
        .join(', ') || 'N/A'

      const pi = b.avgPi != null ? `PI ${b.avgPi}` : 'PI N/A'
      return `- ${b.name}: ${b.totalAds} active ads, ${b.newAdsThisWeek} new this week, est. weekly spend €${Math.round(b.latestWeekSpend).toLocaleString()} (${share}% share, WoW ${spendChangePct}), ${pi}, funnel: ${funnelDist}, top topics: ${topTopics}, recent headlines: ${headlinesStr}`
    })
    .join('\n')

  const prevWeekLabel = prevWeek ? new Date(prevWeek).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'
  const latestWeekLabel = latestWeek ? new Date(latestWeek).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'

  return {
    latestWeek: latestWeekLabel,
    prevWeek: prevWeekLabel,
    totalWeeks: sortedWeeks.length,
    totalMarketSpend: Math.round(totalLatestSpend),
    ownBrandKey: ownKey,
    ownBrandName: byBrand[ownKey]?.name ?? ownBrand,
    brandLines,
    brandCount: Object.keys(byBrand).length,
  }
}

// ─── Workspace profile ───────────────────────────────────────────────────────

interface WorkspaceProfile {
  companyName:      string
  industry:         string
  website:          string
  brandDescription: string
  targetAudience:   string
  aiContext:        string
  ownBrand:         string
}

async function loadWorkspaceProfile(workspaceId: string): Promise<WorkspaceProfile> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin
    .from('workspaces')
    .select('own_brand, company_name, industry, website, brand_description, target_audience, ai_context')
    .eq('id', workspaceId)
    .single()

  return {
    ownBrand:         data?.own_brand          ?? '',
    companyName:      data?.company_name       ?? '',
    industry:         data?.industry           ?? '',
    website:          data?.website            ?? '',
    brandDescription: data?.brand_description  ?? '',
    targetAudience:   data?.target_audience    ?? '',
    aiContext:        data?.ai_context         ?? '',
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  ctx: NonNullable<Awaited<ReturnType<typeof buildDataContext>>>,
  profile: WorkspaceProfile,
) {
  const clientBlock = [
    profile.companyName      && `Company: ${profile.companyName}`,
    profile.industry         && `Industry: ${profile.industry}`,
    profile.website          && `Website: ${profile.website}`,
    profile.targetAudience   && `Target audience: ${profile.targetAudience}`,
    profile.brandDescription && `Brand: ${profile.brandDescription}`,
    profile.aiContext        && `Additional context: ${profile.aiContext}`,
  ].filter(Boolean).join('\n')

  return `You are a senior competitive intelligence analyst embedded inside a paid media analytics platform. You are working exclusively for the client described below.

═══ CLIENT PROFILE ═══
${clientBlock || `Brand: ${ctx.ownBrandName}`}
Own brand in data: ${ctx.ownBrandName}

═══ MARKET DATA SNAPSHOT ═══
Latest week: ${ctx.latestWeek} (${ctx.totalWeeks} weeks of history)
Total estimated market weekly spend: €${ctx.totalMarketSpend.toLocaleString()}
Tracked brands: ${ctx.brandCount}

BRAND BREAKDOWN (sorted by weekly spend):
Each entry: active ads · new ads this week · est. weekly spend · share % · WoW change · Performance Index · funnel split · top topics · recent headlines
${ctx.brandLines}

═══ INSTRUCTIONS ═══
- You are advising ${profile.companyName || ctx.ownBrandName} — frame all insights from their perspective
- Use the actual numbers — never invent data
- Spend figures are estimates — say "estimated" when referencing them
- Use the client profile above to add relevant strategic context (their objectives, audience, positioning)
- Reference creative headlines and funnel data when discussing messaging strategy
- Format: **bold** key figures and brand names; bullets for complex answers; 3-6 sentences for simple ones
- If asked about something outside the data (visual creative, URLs, etc.) say so clearly`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, workspaceId, ownBrand = 'ORLEN', connectionId } = await req.json() as {
    messages: ChatMessage[]
    workspaceId: string
    ownBrand?: string
    connectionId?: string
  }

  if (!workspaceId) return new Response('workspaceId required', { status: 400 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return new Response('AI not configured', { status: 503 })

  // Build data context + workspace profile in parallel
  const [ctx, profile] = await Promise.all([
    buildDataContext(workspaceId, ownBrand, connectionId),
    loadWorkspaceProfile(workspaceId),
  ])

  const systemPrompt = ctx
    ? buildSystemPrompt(ctx, profile)
    : `You are a competitive intelligence assistant for ${profile.companyName || ownBrand}. No ad data has been synced to this workspace yet. Politely tell the user to go to Connections and sync their Snowflake data first.`

  // Call OpenRouter with streaming
  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://cluezero.vercel.app',
      'X-Title': 'ClueZero Competitive Intel',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-haiku',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.4,
    }),
  })

  if (!openRouterRes.ok) {
    const err = await openRouterRes.text()
    return new Response(`AI error: ${err}`, { status: 502 })
  }

  // Stream SSE back to client
  const stream = new ReadableStream({
    async start(controller) {
      const reader = openRouterRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) { controller.close(); break }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') { controller.close(); return }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) controller.enqueue(new TextEncoder().encode(delta))
          } catch { /* ignore malformed chunks */ }
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
