// GET /api/connections/asana?workspaceId=xxx
// Redirects the user to Asana OAuth consent screen

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ASANA_AUTH_URL = 'https://app.asana.com/-/oauth_authorize'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const clientId = process.env.ASANA_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'Asana not configured on this server' }, { status: 503 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/asana/callback`

  // Encode workspaceId in state so callback knows which workspace to save to
  const state = Buffer.from(JSON.stringify({ workspaceId, userId: user.id })).toString('base64url')

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    state,
  })

  return NextResponse.redirect(`${ASANA_AUTH_URL}?${params}`)
}
