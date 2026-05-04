// POST /api/agents/watch/run
// Competitive Watch Agent — uses Vercel AI SDK tool-use loop so Claude
// autonomously decides what data to pull before writing its findings.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createAsanaTaskComposio } from '@/lib/asana'
import { createClickUpTaskComposio, severityToClickUpPriority } from '@/lib/clickup'

export const runtime     = 'nodejs'
export const maxDuration = 120

// ─── Types ────────────────────────────────────────────────────────────────────

interface Finding {
  title:    string
  detail:   string
  severity: 'high' | 'medium' | 'low'
  brand?:   string
}

interface ActionTaken {
  type:   'slack' | 'email' | 'brief' | 'asana' | 'clickup'
  status: 'sent' | 'failed' | 'skipped'
  detail: string
}

interface AgentOutput {
  summary:         string
  findings:        Finding[]
  recommendations: { priority: 'high' | 'medium' | 'low'; action: string }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArr<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function weekStart(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().slice(0, 10)
}

// ─── Tool factory (closes over admin + workspaceId) ───────────────────────────

function buildTools(admin: Admin, workspaceId: string, connectionId?: string) {

  async function fetchAds(brandName?: string) {
    let q = admin
      .from('ads')
      .select(`id, first_seen_at, performance_index, platform, is_active,
        tracked_brands ( name, is_own_brand ),
        ad_spend_estimates ( week_start, est_spend_eur ),
        ad_enrichments ( funnel_stage, topic, sentiment )`)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
    if (connectionId) q = q.eq('connection_id', connectionId)
    const { data } = await q
    const rows = (data ?? []) as any[]
    if (brandName) {
      return rows.filter(r => r.tracked_brands?.name?.toLowerCase().includes(brandName.toLowerCase()))
    }
    return rows
  }

  return {

    // ── Tool 1: weekly spend by brand ───────────────────────────────────────
    getSpendTrend: tool({
      description: 'Get week-over-week ad spend for all brands or a specific brand. Returns this week vs last week spend in EUR, change %, and market share.',
      inputSchema: z.object({
        brandName: z.string().optional().describe('Filter to a specific brand name. Omit for all brands.'),
      }),
      execute: async ({ brandName }) => {
        const rows = await fetchAds(brandName)
        if (!rows.length) return { error: 'No data found' }

        const allWeeks = new Set<string>()
        for (const ad of rows) {
          for (const est of toArr(ad.ad_spend_estimates)) allWeeks.add(est.week_start)
        }
        const sorted   = [...allWeeks].sort()
        const thisWeek = sorted[sorted.length - 1]
        const lastWeek = sorted[sorted.length - 2]
        if (!thisWeek) return { error: 'No spend data' }

        const brands: Record<string, { name: string; isOwn: boolean; thisSpend: number; lastSpend: number }> = {}
        for (const ad of rows) {
          const name  = ad.tracked_brands?.name ?? 'Unknown'
          const isOwn = ad.tracked_brands?.is_own_brand ?? false
          if (!brands[name]) brands[name] = { name, isOwn, thisSpend: 0, lastSpend: 0 }
          for (const est of toArr(ad.ad_spend_estimates)) {
            if (est.week_start === thisWeek) brands[name].thisSpend += Number(est.est_spend_eur ?? 0)
            if (est.week_start === lastWeek) brands[name].lastSpend += Number(est.est_spend_eur ?? 0)
          }
        }

        const totalThis = Object.values(brands).reduce((s, b) => s + b.thisSpend, 0)
        return {
          thisWeek, lastWeek,
          brands: Object.values(brands)
            .sort((a, b) => b.thisSpend - a.thisSpend)
            .map(b => ({
              name:      b.name,
              isOwn:     b.isOwn,
              thisSpend: Math.round(b.thisSpend),
              lastSpend: Math.round(b.lastSpend),
              changePct: b.lastSpend > 0 ? Math.round((b.thisSpend - b.lastSpend) / b.lastSpend * 100) : null,
              sharePct:  totalThis > 0 ? Math.round(b.thisSpend / totalThis * 100) : 0,
            })),
        }
      },
    }),

    // ── Tool 2: new ads this week ────────────────────────────────────────────
    getNewAds: tool({
      description: 'Get ads that first appeared this week, optionally filtered by brand. Useful for spotting new creative launches or market entrants.',
      inputSchema: z.object({
        brandName: z.string().optional().describe('Filter to a specific brand name. Omit for all brands.'),
        limit:     z.number().optional().default(10).describe('Max results to return'),
      }),
      execute: async ({ brandName, limit = 10 }) => {
        const rows = await fetchAds(brandName)
        if (!rows.length) return { newAds: [] }

        const allWeeks = new Set<string>()
        for (const ad of rows) {
          for (const est of toArr(ad.ad_spend_estimates)) allWeeks.add(est.week_start)
        }
        const thisWeek = [...allWeeks].sort().at(-1)
        if (!thisWeek) return { newAds: [] }

        const newAds = rows
          .filter(ad => weekStart(ad.first_seen_at) === thisWeek)
          .slice(0, limit)
          .map(ad => ({
            brand:       ad.tracked_brands?.name ?? 'Unknown',
            platform:    ad.platform,
            firstSeen:   ad.first_seen_at,
            pi:          ad.performance_index,
            funnel:      toArr(ad.ad_enrichments)[0]?.funnel_stage ?? null,
            topic:       toArr(ad.ad_enrichments)[0]?.topic ?? null,
          }))

        return { thisWeek, count: newAds.length, newAds }
      },
    }),

    // ── Tool 3: performance index by brand ──────────────────────────────────
    getPerformanceIndex: tool({
      description: 'Get average Performance Index (PI) scores for brands. PI measures creative effectiveness (0-100). Higher = better performing ads. Use this to understand who has the strongest creatives.',
      inputSchema: z.object({
        brandName: z.string().optional().describe('Filter to a specific brand. Omit for all.'),
      }),
      execute: async ({ brandName }) => {
        const rows = await fetchAds(brandName)
        if (!rows.length) return { brands: [] }

        const brands: Record<string, { name: string; scores: number[]; isOwn: boolean }> = {}
        for (const ad of rows) {
          const name = ad.tracked_brands?.name ?? 'Unknown'
          if (!brands[name]) brands[name] = { name, scores: [], isOwn: ad.tracked_brands?.is_own_brand ?? false }
          if (ad.performance_index != null) brands[name].scores.push(Number(ad.performance_index))
        }

        return {
          brands: Object.values(brands)
            .filter(b => b.scores.length > 0)
            .map(b => ({
              name:   b.name,
              isOwn:  b.isOwn,
              avgPi:  Math.round(b.scores.reduce((s, v) => s + v, 0) / b.scores.length),
              maxPi:  Math.round(Math.max(...b.scores)),
              adCount: b.scores.length,
            }))
            .sort((a, b) => b.avgPi - a.avgPi),
        }
      },
    }),

    // ── Tool 4: funnel & topic strategy ─────────────────────────────────────
    getCreativeStrategy: tool({
      description: 'Get funnel stage distribution and topic breakdown for a brand\'s ads. Shows whether they\'re focusing on awareness, consideration, or conversion. Use to spot strategic shifts.',
      inputSchema: z.object({
        brandName: z.string().describe('Brand name to analyse'),
      }),
      execute: async ({ brandName }) => {
        const rows = await fetchAds(brandName)
        if (!rows.length) return { brand: brandName, error: 'No ads found for this brand' }

        const funnelCounts: Record<string, number> = {}
        const topicCounts:  Record<string, number> = {}

        for (const ad of rows) {
          for (const e of toArr(ad.ad_enrichments)) {
            if (e.funnel_stage) funnelCounts[e.funnel_stage] = (funnelCounts[e.funnel_stage] ?? 0) + 1
            if (e.topic)        topicCounts[e.topic]         = (topicCounts[e.topic]         ?? 0) + 1
          }
        }

        const total = Object.values(funnelCounts).reduce((s, v) => s + v, 0) || 1

        return {
          brand:  brandName,
          adCount: rows.length,
          funnelDistribution: Object.entries(funnelCounts)
            .map(([stage, count]) => ({ stage, count, pct: Math.round(count / total * 100) }))
            .sort((a, b) => b.count - a.count),
          topTopics: Object.entries(topicCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([topic, count]) => ({ topic, count })),
        }
      },
    }),

    // ── Tool 5: market overview ──────────────────────────────────────────────
    getMarketOverview: tool({
      description: 'Get a high-level market snapshot: total active advertisers, total ads, most active platforms, and market concentration (top 3 brands share). Use this to get context before diving deeper.',
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await fetchAds()
        if (!rows.length) return { error: 'No data' }

        const brands    = new Set(rows.map((r: any) => r.tracked_brands?.name ?? 'Unknown'))
        const platforms = rows.reduce((acc: Record<string, number>, r: any) => {
          acc[r.platform] = (acc[r.platform] ?? 0) + 1; return acc
        }, {})

        return {
          totalBrands:   brands.size,
          totalAds:      rows.length,
          platforms:     Object.entries(platforms).sort(([, a], [, b]) => (b as number) - (a as number)),
        }
      },
    }),
  }
}

// ─── Send Slack notification ──────────────────────────────────────────────────

async function sendSlack(webhookUrl: string, output: AgentOutput, ownBrand: string): Promise<ActionTaken> {
  const highFindings = output.findings.filter(f => f.severity === 'high')
  const emoji = highFindings.length > 0 ? '🚨' : '📊'

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `${emoji} Weekly Competitive Brief — ${ownBrand}` } },
    { type: 'section', text: { type: 'mrkdwn', text: output.summary } },
    { type: 'divider' },
    ...output.findings.slice(0, 3).map(f => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🟢'} ${f.title}*\n${f.detail}`,
      },
    })),
    ...(output.recommendations.length > 0 ? [
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: `*Recommended actions:*\n${output.recommendations.map(r => `• ${r.action}`).join('\n')}` } },
    ] : []),
  ]

  try {
    const r = await fetch(webhookUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })
    return { type: 'slack', status: r.ok ? 'sent' : 'failed', detail: r.ok ? 'Delivered' : `HTTP ${r.status}` }
  } catch (err) {
    return { type: 'slack', status: 'failed', detail: String(err) }
  }
}

// ─── Send email via Resend ────────────────────────────────────────────────────

async function sendEmail(toEmail: string, output: AgentOutput, ownBrand: string): Promise<ActionTaken> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return { type: 'email', status: 'skipped', detail: 'RESEND_API_KEY not set' }

  const highCount = output.findings.filter(f => f.severity === 'high').length
  const subject   = highCount > 0
    ? `⚠️ ${highCount} high-priority alert${highCount > 1 ? 's' : ''} — ${ownBrand} competitive brief`
    : `📊 Weekly competitive brief — ${ownBrand}`

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#4f46e5">Weekly Competitive Brief</h2>
      <p>${output.summary}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
      <h3>What happened this week</h3>
      ${output.findings.map(f => `
        <div style="margin-bottom:16px;padding:12px;border-left:3px solid ${f.severity === 'high' ? '#ef4444' : f.severity === 'medium' ? '#f59e0b' : '#10b981'};background:#f9fafb;border-radius:0 8px 8px 0">
          <strong>${f.title}</strong>${f.brand ? ` <span style="color:#6b7280">(${f.brand})</span>` : ''}
          <p style="margin:4px 0 0;color:#4b5563;font-size:14px">${f.detail}</p>
        </div>
      `).join('')}
      ${output.recommendations.length > 0 ? `
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <h3>Recommended actions</h3>
        <ul style="padding-left:20px">
          ${output.recommendations.map(r => `<li style="margin-bottom:8px">${r.action}</li>`).join('')}
        </ul>
      ` : ''}
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">Sent by ClueZero Watch Agent</p>
    </div>`

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ClueZero <alerts@cluezero.ai>', to: [toEmail], subject, html }),
    })
    const body = await r.json()
    return { type: 'email', status: r.ok ? 'sent' : 'failed', detail: r.ok ? `Delivered to ${toEmail}` : body?.message ?? `HTTP ${r.status}` }
  } catch (err) {
    return { type: 'email', status: 'failed', detail: String(err) }
  }
}

// ─── Asana / ClickUp task creation ───────────────────────────────────────────

async function fireAsanaTasks(admin: Admin, workspaceId: string, output: AgentOutput): Promise<ActionTaken> {
  const { data: conn } = await admin.from('connections').select('*').eq('workspace_id', workspaceId).eq('app_name', 'asana').eq('status', 'active').single()
  if (!conn)                      return { type: 'asana', status: 'skipped', detail: 'Asana not connected' }
  if (!conn.config?.project_gid)  return { type: 'asana', status: 'skipped', detail: 'No Asana project selected' }

  const highs = output.findings.filter(f => f.severity === 'high')
  if (!highs.length) return { type: 'asana', status: 'skipped', detail: 'No high-severity findings' }

  let created = 0
  for (const f of highs) {
    const task = await createAsanaTaskComposio(workspaceId, {
      projectGid: conn.config.project_gid,
      name:  `[ClueZero Alert] ${f.title}`,
      notes: `${f.detail}\n\nBrand: ${f.brand ?? 'N/A'}\nSeverity: ${f.severity}`,
    })
    if (task) created++
  }

  return { type: 'asana', status: created > 0 ? 'sent' : 'failed', detail: created > 0 ? `Created ${created} task(s) in ${conn.config?.project_name ?? 'project'}` : 'Failed to create tasks' }
}

async function fireClickUpTasks(admin: Admin, workspaceId: string, output: AgentOutput): Promise<ActionTaken> {
  const { data: conn } = await admin.from('connections').select('*').eq('workspace_id', workspaceId).eq('app_name', 'clickup').eq('status', 'active').single()
  if (!conn)                    return { type: 'clickup', status: 'skipped', detail: 'ClickUp not connected' }
  if (!conn.config?.list_id)    return { type: 'clickup', status: 'skipped', detail: 'No ClickUp list selected' }

  const highs = output.findings.filter(f => f.severity === 'high')
  if (!highs.length) return { type: 'clickup', status: 'skipped', detail: 'No high-severity findings' }

  let created = 0
  for (const f of highs) {
    const task = await createClickUpTaskComposio(workspaceId, {
      listId:      conn.config.list_id,
      name:        `[ClueZero Alert] ${f.title}`,
      description: `${f.detail}\n\nBrand: ${f.brand ?? 'N/A'}\nSeverity: ${f.severity}`,
      priority:    severityToClickUpPriority(f.severity),
    })
    if (task) created++
  }

  return { type: 'clickup', status: created > 0 ? 'sent' : 'failed', detail: created > 0 ? `Created ${created} task(s) in ${conn.config?.list_name ?? 'list'}` : 'Failed to create tasks' }
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  const isFromCron = cronSecret === process.env.CRON_SECRET

  if (!isFromCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { workspaceId: string; connectionId?: string }
  const { workspaceId, connectionId } = body
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: ws } = await admin.from('workspaces').select('own_brand, company_name').eq('id', workspaceId).single()
  const ownBrand = ws?.own_brand ?? ws?.company_name ?? 'your brand'

  const { data: runRow } = await admin
    .from('agent_runs')
    .insert({ workspace_id: workspaceId, agent_type: 'competitive_watch', status: 'running' })
    .select('id').single()
  const runId: string = runRow?.id ?? ''

  const actionsTaken: ActionTaken[] = []

  try {
    // Build OpenRouter client via AI SDK
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    })

    const tools = buildTools(admin, workspaceId, connectionId)

    // Run the agent loop — Claude calls tools autonomously up to 8 steps
    const { text, steps } = await generateText({
      model:    openrouter('anthropic/claude-sonnet-4-5'),
      stopWhen: stepCountIs(8),
      system: `You are a competitive intelligence watch agent for ${ownBrand}.

Your job: analyse this week's competitive landscape, identify what actually matters (not every small change), and produce a concise brief.

Use the available tools to gather data. Start with getMarketOverview to understand the landscape, then investigate specific brands or trends you find interesting. Focus on changes >20% in spend, significant new ad activity, notable PI shifts, or strategic pivots in creative strategy.

When you have enough information, respond with ONLY valid JSON (no markdown, no explanation):
{
  "summary": "2-3 sentence plain English summary of the most important things that happened this week",
  "findings": [
    {
      "title": "short descriptive title",
      "detail": "1-2 sentences: what changed and why it matters for ${ownBrand}",
      "severity": "high|medium|low",
      "brand": "brand name or null"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific, actionable recommendation for ${ownBrand}"
    }
  ]
}

Rules:
- Max 5 findings, 3 recommendations
- Only include findings where the change is meaningful
- Be specific with numbers from the data
- Frame everything from ${ownBrand}'s perspective`,
      prompt: `Investigate this week's competitive landscape for ${ownBrand}. Start with an overview, then dig into whatever looks most significant.`,
      tools,
    })

    // Parse the final JSON output
    const raw   = text.trim()
    const first = raw.indexOf('{')
    const last  = raw.lastIndexOf('}')
    if (first === -1 || last === -1) throw new Error('Agent did not return valid JSON findings')

    const output = JSON.parse(raw.slice(first, last + 1)) as AgentOutput

    // Load schedule for notification targets
    const { data: schedule } = await admin
      .from('agent_schedules')
      .select('slack_webhook_url, notify_email')
      .eq('workspace_id', workspaceId)
      .single()

    if (schedule?.slack_webhook_url) actionsTaken.push(await sendSlack(schedule.slack_webhook_url, output, ownBrand))
    if (schedule?.notify_email)      actionsTaken.push(await sendEmail(schedule.notify_email, output, ownBrand))
    actionsTaken.push(await fireAsanaTasks(admin, workspaceId, output))
    actionsTaken.push(await fireClickUpTasks(admin, workspaceId, output))
    actionsTaken.push({ type: 'brief', status: 'sent', detail: 'Brief saved to dashboard' })

    // Record tool calls made during the run
    const toolCallsLog = steps
      .flatMap(s => s.toolCalls ?? [])
      .map(tc => ({ tool: tc.toolName }))

    await admin.from('agent_runs').update({
      status:        'completed',
      summary:       output.summary,
      findings:      output.findings,
      actions_taken: actionsTaken,
      completed_at:  new Date().toISOString(),
      // Store tool calls in findings metadata for debugging
      ...(toolCallsLog.length ? { error: null } : {}),
    }).eq('id', runId)

    await admin.from('agent_schedules')
      .update({ last_run_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)

    return NextResponse.json({
      ok: true, runId,
      summary:      output.summary,
      findings:     output.findings,
      toolCalls:    toolCallsLog,
      actionsTaken,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await admin.from('agent_runs').update({
      status: 'failed', error: msg, completed_at: new Date().toISOString(),
    }).eq('id', runId)
    return NextResponse.json({ error: msg, runId }, { status: 500 })
  }
}
