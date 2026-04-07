// GET/POST /api/agents/watch/schedule?workspaceId=
// Read or update the watch agent schedule for a workspace

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const [{ data: membership }, { data: schedule }] = await Promise.all([
    admin.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).single(),
    admin.from('agent_schedules').select('*').eq('workspace_id', workspaceId).single(),
  ])

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ schedule: schedule ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    workspaceId:      string
    enabled?:         boolean
    runDay?:          string
    runHour?:         number
    slackWebhookUrl?: string | null
    notifyEmail?:     string | null
  }
  const { workspaceId } = body
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('agent_schedules')
    .upsert({
      workspace_id:      workspaceId,
      enabled:           body.enabled ?? false,
      run_day:           body.runDay ?? 'monday',
      run_hour:          body.runHour ?? 7,
      slack_webhook_url: body.slackWebhookUrl ?? null,
      notify_email:      body.notifyEmail ?? null,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'workspace_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}
