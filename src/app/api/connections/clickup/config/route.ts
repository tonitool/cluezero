// POST /api/connections/clickup/config
// Save the selected ClickUp list for the Watch Agent to create tasks in

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    workspaceId: string
    teamId:      string
    teamName:    string
    spaceId:     string
    spaceName:   string
    listId:      string
    listName:    string
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
        team_id:    body.teamId,
        team_name:  body.teamName,
        space_id:   body.spaceId,
        space_name: body.spaceName,
        list_id:    body.listId,
        list_name:  body.listName,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('platform', 'clickup')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connection: data })
}
