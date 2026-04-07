// GET /api/connections/asana/projects?workspaceId=
// Returns Asana workspaces and projects for the connected account

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { refreshAsanaToken } from '@/lib/asana'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

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

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get the productivity connection
  const { data: conn } = await admin
    .from('productivity_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'asana')
    .single()

  if (!conn) return NextResponse.json({ error: 'Asana not connected' }, { status: 404 })

  // Refresh token if expired
  let accessToken = conn.access_token
  if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
    const refreshed = await refreshAsanaToken(conn.refresh_token)
    if (refreshed) {
      accessToken = refreshed.access_token
      await admin.from('productivity_connections').update({
        access_token:     refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at:       new Date().toISOString(),
      }).eq('id', conn.id)
    }
  }

  // Fetch workspaces
  const workspacesRes = await fetch('https://app.asana.com/api/1.0/workspaces', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!workspacesRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Asana workspaces' }, { status: 502 })
  }

  const workspacesData = await workspacesRes.json() as { data: { gid: string; name: string }[] }
  const workspaces = workspacesData.data ?? []

  // Fetch projects for each workspace (limit to first 2 workspaces to avoid rate limits)
  const result: { gid: string; name: string; projects: { gid: string; name: string }[] }[] = []

  for (const ws of workspaces.slice(0, 2)) {
    const projectsRes = await fetch(
      `https://app.asana.com/api/1.0/workspaces/${ws.gid}/projects?limit=50&archived=false`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    let projects: { gid: string; name: string }[] = []
    if (projectsRes.ok) {
      const pd = await projectsRes.json() as { data: { gid: string; name: string }[] }
      projects = pd.data ?? []
    }

    result.push({ ...ws, projects })
  }

  return NextResponse.json({
    workspaces: result,
    currentConfig: conn.config,
  })
}
