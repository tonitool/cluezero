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
    .select(`id, first_seen_at, performance_index, topic,
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
    avgPi: number | null
    piScores: number[]
    topics: string[]
    funnelStages: string[]
    platforms: string[]
  }> = {}

  const allWeekStarts = new Set<string>()

  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    if (!byBrand[key]) {
      byBrand[key] = { name: rawName, totalAds: 0, newAdsThisWeek: 0, totalSpend: 0, latestWeekSpend: 0, avgPi: null, piScores: [], topics: [], funnelStages: [], platforms: [] }
    }
    byBrand[key].totalAds++
    if (ad.performance_index != null) byBrand[key].piScores.push(Number(ad.performance_index))
    if (ad.topic) byBrand[key].topics.push(String(ad.topic))

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

  // Recalculate latest week spend per brand
  for (const ad of rows) {
    const rawName = (ad.tracked_brands as unknown as { name: string } | null)?.name ?? 'Unknown'
    const key = brandKey(rawName)
    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []
    for (const est of estimates) {
      if (est.week_start === latestWeek) {
        byBrand[key].latestWeekSpend += Number(est.est_spend_eur ?? 0)
      }
      // Count new ads this week
      const weekStart = getWeekStart(ad.first_seen_at)
      if (weekStart === latestWeek) {
        // already counted above but only once, handle via set
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
      const topTopics = [...new Set(b.topics)].slice(0, 3).join(', ') || 'N/A'
      const topFunnels = [...new Set(b.funnelStages)].slice(0, 3).join(', ') || 'N/A'
      const pi = b.avgPi != null ? `PI ${b.avgPi}` : 'PI N/A'
      return `- ${b.name}: ${b.totalAds} active ads, ${b.newAdsThisWeek} new this week, est. weekly spend €${Math.round(b.latestWeekSpend).toLocaleString()} (${share}% share), ${pi}, topics: ${topTopics}, funnel stages: ${topFunnels}`
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

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: NonNullable<Awaited<ReturnType<typeof buildDataContext>>>, ownBrand: string) {
  return `You are a competitive intelligence analyst assistant embedded inside a paid media analytics platform. You have access to real ad market data for a fuel & mobility retail sector workspace.

YOUR OWN BRAND: ${ctx.ownBrandName} (the user's brand you are helping)

LATEST DATA SNAPSHOT (week ending ${ctx.latestWeek}, ${ctx.totalWeeks} weeks of history):
Total estimated market weekly spend: €${ctx.totalMarketSpend.toLocaleString()}
Number of tracked brands: ${ctx.brandCount}

BRAND BREAKDOWN (sorted by weekly spend):
${ctx.brandLines}

INSTRUCTIONS:
- Answer questions about this data concisely and in a consultative tone
- Use the actual numbers above — do not invent data
- When referencing spend, always say "estimated" as these are spend estimates
- Focus insights on what matters for ${ownBrand}: competitive positioning, threats, opportunities
- If asked about something not in the data (e.g. creative thumbnails, exact ad text), say so clearly
- Format responses with **bold** for key figures and brand names
- Keep answers focused — 3-6 sentences for simple questions, structured bullets for complex ones
- Today's date context: the latest data week ends ${ctx.latestWeek}`
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

  // Build data context
  const ctx = await buildDataContext(workspaceId, ownBrand, connectionId)

  const systemPrompt = ctx
    ? buildSystemPrompt(ctx, ownBrand)
    : `You are a competitive intelligence assistant. No data has been synced to this workspace yet. Politely tell the user to go to Connections and sync their Snowflake data first.`

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
