// GET /api/cron/agent-watch
// Called by Vercel Cron every day at 07:00 UTC.
// Finds all enabled schedules whose run_day matches today and fires the watch agent.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime     = 'nodejs'
export const maxDuration = 300  // 5 min — runs multiple workspaces in sequence

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export async function GET(req: NextRequest) {
  // Verify cron secret (set CRON_SECRET in env, Vercel passes it as Authorization header)
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const nowUtc  = new Date()
  const todayDay = DAY_NAMES[nowUtc.getUTCDay()]
  const thisHour = nowUtc.getUTCHours()

  // Find all enabled schedules that should fire now
  const { data: schedules } = await admin
    .from('agent_schedules')
    .select('workspace_id, run_day, run_hour')
    .eq('enabled', true)

  if (!schedules?.length) {
    return NextResponse.json({ ok: true, fired: 0, message: 'No enabled schedules' })
  }

  const toRun = schedules.filter(s => {
    const matchDay  = s.run_day === 'daily' || s.run_day === todayDay
    const matchHour = s.run_hour === thisHour
    return matchDay && matchHour
  })

  if (!toRun.length) {
    return NextResponse.json({ ok: true, fired: 0, message: `No schedules match ${todayDay} hour ${thisHour}` })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cluezero.vercel.app'
  const results: { workspaceId: string; ok: boolean; error?: string }[] = []

  for (const s of toRun) {
    try {
      const res = await fetch(`${baseUrl}/api/agents/watch/run`, {
        method:  'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-cron-secret':  process.env.CRON_SECRET ?? '',
        },
        body: JSON.stringify({ workspaceId: s.workspace_id }),
      })
      const data = await res.json()
      results.push({ workspaceId: s.workspace_id, ok: res.ok, error: data.error })
    } catch (err) {
      results.push({ workspaceId: s.workspace_id, ok: false, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, fired: toRun.length, results })
}
