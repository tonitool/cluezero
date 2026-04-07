// GET /api/connections/google?workspaceId=xxx
// Redirects the user to Google OAuth consent screen

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
].join(' ')

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'Google Ads not configured on this server' }, { status: 503 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/google/callback`

  // Encode workspaceId in state so callback knows which workspace to save to
  const state = Buffer.from(JSON.stringify({ workspaceId, userId: user.id })).toString('base64url')

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',  // gives refresh_token
    prompt:        'consent',  // always show consent to get refresh_token
    state,
  })

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
}
