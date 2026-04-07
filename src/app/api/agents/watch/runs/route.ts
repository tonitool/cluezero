// GET /api/agents/watch/runs?workspaceId=
// Returns recent agent runs for a workspace

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

  const [{ data: membership }, { data: runs }] = await Promise.all([
    admin.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).single(),
    admin.from('agent_runs')
      .select('id, agent_type, status, started_at, completed_at, summary, findings, actions_taken, error')
      .eq('workspace_id', workspaceId)
      .order('started_at', { ascending: false })
      .limit(20),
  ])

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ runs: runs ?? [] })
}
