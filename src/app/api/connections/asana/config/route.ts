// POST /api/connections/asana/config
// Save the selected Asana workspace + project for the Watch Agent to use

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    workspaceId:    string
    workspaceGid:   string
    workspaceName:  string
    projectGid:     string
    projectName:    string
  }

  const { workspaceId } = body
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Require owner or admin
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
    .from('productivity_connections')
    .update({
      config: {
        workspace_gid:  body.workspaceGid,
        workspace_name: body.workspaceName,
        project_gid:    body.projectGid,
        project_name:   body.projectName,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('platform', 'asana')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connection: data })
}
