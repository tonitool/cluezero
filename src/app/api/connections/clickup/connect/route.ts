// POST /api/connections/clickup/connect
// Saves a ClickUp personal API token, verifies it, and returns the user's spaces/lists

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface ClickUpTeam {
  id:   string
  name: string
}

interface ClickUpSpace {
  id:   string
  name: string
}

interface ClickUpList {
  id:   string
  name: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { workspaceId: string; apiToken: string }
  const { workspaceId, apiToken } = body

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  if (!apiToken)    return NextResponse.json({ error: 'apiToken required' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 })
  }

  // Verify the token works by fetching user info
  const meRes = await fetch('https://api.clickup.com/api/v2/user', {
    headers: { 'Authorization': apiToken },
  })

  if (!meRes.ok) {
    return NextResponse.json({ error: 'Invalid ClickUp API token' }, { status: 400 })
  }

  const meData = await meRes.json() as { user: { id: number; username: string; email: string } }
  const accountName = meData.user?.username ?? meData.user?.email ?? 'ClickUp'

  // Fetch teams (workspaces in ClickUp terminology)
  const teamsRes = await fetch('https://api.clickup.com/api/v2/team', {
    headers: { 'Authorization': apiToken },
  })

  let teams: ClickUpTeam[] = []
  let spaces: { id: string; name: string; teamId: string }[] = []
  let lists:  { id: string; name: string; spaceId: string }[] = []

  if (teamsRes.ok) {
    const teamsData = await teamsRes.json() as { teams: ClickUpTeam[] }
    teams = teamsData.teams ?? []

    // Fetch spaces for each team (first team only to avoid rate limits)
    for (const team of teams.slice(0, 1)) {
      const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${team.id}/space?archived=false`, {
        headers: { 'Authorization': apiToken },
      })

      if (spacesRes.ok) {
        const spacesData = await spacesRes.json() as { spaces: ClickUpSpace[] }
        const teamSpaces = spacesData.spaces ?? []

        for (const space of teamSpaces.slice(0, 3)) {
          spaces.push({ ...space, teamId: team.id })

          // Fetch folderless lists in this space
          const listsRes = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list?archived=false`, {
            headers: { 'Authorization': apiToken },
          })

          if (listsRes.ok) {
            const listsData = await listsRes.json() as { lists: ClickUpList[] }
            for (const list of listsData.lists ?? []) {
              lists.push({ ...list, spaceId: space.id })
            }
          }
        }
      }
    }
  }

  // Save the connection
  await admin.from('productivity_connections').upsert({
    workspace_id:  workspaceId,
    platform:      'clickup',
    account_name:  accountName,
    access_token:  apiToken,
    refresh_token: null,
    config: {
      team_id:    teams[0]?.id    ?? null,
      team_name:  teams[0]?.name  ?? null,
      space_id:   null,
      space_name: null,
      list_id:    null,
      list_name:  null,
    },
    status:        'active',
    error_message: null,
    updated_at:    new Date().toISOString(),
  }, { onConflict: 'workspace_id,platform' })

  return NextResponse.json({ ok: true, accountName, teams, spaces, lists })
}
