import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Enriches unenriched ads with AI-generated sentiment + funnel stage.
// Trigger: POST /api/ads/enrich  { workspaceId: string }
//
// Uses OpenRouter → google/gemini-flash-1.5 (cheap, fast, good at structured output).
// Batch size: 10 ads per call to stay within token limits.

const BATCH_SIZE = 10

export async function POST(req: NextRequest) {
  const { workspaceId } = await req.json() as { workspaceId: string }

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Find ads that haven't been enriched yet
  const { data: unenrichedAds } = await supabase
    .from('ads')
    .select('id, headline, body, platform')
    .eq('workspace_id', workspaceId)
    .not('id', 'in',
      supabase.from('ad_enrichments').select('ad_id')
    )
    .limit(50)

  if (!unenrichedAds?.length) {
    return NextResponse.json({ message: 'All ads already enriched' })
  }

  // Process in batches
  let enriched = 0
  for (let i = 0; i < unenrichedAds.length; i += BATCH_SIZE) {
    const batch = unenrichedAds.slice(i, i + BATCH_SIZE)

    const prompt = batch.map((ad, idx) =>
      `Ad ${idx + 1}:\nHeadline: ${ad.headline ?? '(none)'}\nBody: ${ad.body ?? '(none)'}`
    ).join('\n\n')

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://competitive-intel.app',
        'X-Title': 'Competitive Intel Ad Tracker',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert advertising analyst. For each ad, return:
- sentiment_score: float from -1.0 (very negative/serious) to +1.0 (very positive/enthusiastic)
- funnel_stage: one of "See" (awareness), "Think" (consideration), "Do" (conversion), "Care" (retention)
- topics: array of 1-3 short topic strings (e.g. "price", "loyalty", "sustainability", "new product")

Return a JSON object with key "results" containing an array of objects in the same order as the ads.`,
          },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) continue

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const content = json.choices[0]?.message?.content
    if (!content) continue

    type EnrichmentResult = {
      sentiment_score: number
      funnel_stage: 'See' | 'Think' | 'Do' | 'Care'
      topics: string[]
    }

    const parsed = JSON.parse(content) as { results: EnrichmentResult[] }
    const results: EnrichmentResult[] = parsed.results ?? []

    for (let j = 0; j < batch.length; j++) {
      const result = results[j]
      if (!result) continue

      await supabase.from('ad_enrichments').upsert({
        ad_id: batch[j].id,
        sentiment_score: result.sentiment_score,
        funnel_stage: result.funnel_stage,
        topics: result.topics,
      }, { onConflict: 'ad_id' })

      enriched++
    }
  }

  return NextResponse.json({ ok: true, enriched })
}
