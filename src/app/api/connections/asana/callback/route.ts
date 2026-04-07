// GET /api/connections/asana/callback
// Asana redirects here after user grants permission.
// Exchanges code for tokens, fetches user info + workspaces, saves to DB.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=asana_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=asana_invalid`)
  }

  // Decode state
  let workspaceId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    workspaceId = decoded.workspaceId
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=asana_state`)
  }

  const clientId     = process.env.ASANA_CLIENT_ID!
  const clientSecret = process.env.ASANA_CLIENT_SECRET!
  const redirectUri  = `${appUrl}/api/connections/asana/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Asana token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=asana_token`)
  }

  const tokens = await tokenRes.json() as {
    access_token:  string
    refresh_token: string
    expires_in:    number
    data: {
      id:    string
      name:  string
      email: string
    }
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Fetch user's workspaces
  const workspacesRes = await fetch('https://app.asana.com/api/1.0/workspaces', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  })

  let defaultWorkspaceGid  = ''
  let defaultWorkspaceName = ''

  if (workspacesRes.ok) {
    const wsData = await workspacesRes.json() as { data: { gid: string; name: string }[] }
    if (wsData.data?.length > 0) {
      defaultWorkspaceGid  = wsData.data[0].gid
      defaultWorkspaceName = wsData.data[0].name
    }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await admin.from('productivity_connections').upsert({
    workspace_id:     workspaceId,
    platform:         'asana',
    account_name:     tokens.data?.name ?? 'Asana',
    access_token:     tokens.access_token,
    refresh_token:    tokens.refresh_token,
    token_expires_at: expiresAt,
    config: {
      workspace_gid:  defaultWorkspaceGid,
      workspace_name: defaultWorkspaceName,
      project_gid:    null,
      project_name:   null,
    },
    status:        'active',
    error_message: null,
    updated_at:    new Date().toISOString(),
  }, { onConflict: 'workspace_id,platform' })

  return NextResponse.redirect(`${appUrl}/dashboard?connection_success=asana`)
}
