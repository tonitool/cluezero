// GET /api/connections/meta?workspaceId=xxx
// Redirects user to Meta OAuth

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const META_AUTH_URL = 'https://www.facebook.com/v20.0/dialog/oauth'

const SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
  'read_insights',
].join(',')

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const appId = process.env.META_APP_ID
  if (!appId) return NextResponse.json({ error: 'Meta Ads not configured on this server' }, { status: 503 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/meta/callback`
  const state = Buffer.from(JSON.stringify({ workspaceId, userId: user.id })).toString('base64url')

  const params = new URLSearchParams({
    client_id:    appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope:        SCOPES,
    state,
  })

  return NextResponse.redirect(`${META_AUTH_URL}?${params}`)
}
