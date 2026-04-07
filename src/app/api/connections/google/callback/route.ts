// GET /api/connections/google/callback
// Google redirects here after user grants permission.
// Exchanges code for tokens, fetches accessible customer accounts, saves to DB.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=google_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=google_invalid`)
  }

  // Decode state
  let workspaceId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    workspaceId = decoded.workspaceId
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=google_state`)
  }

  const clientId     = process.env.GOOGLE_ADS_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!
  const redirectUri  = `${appUrl}/api/connections/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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
    console.error('Google token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=google_token`)
  }

  const tokens = await tokenRes.json() as {
    access_token:  string
    refresh_token?: string
    expires_in:    number
    scope:         string
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Fetch accessible Google Ads customer accounts
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
  const accountsRes = await fetch(
    'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
    {
      headers: {
        'Authorization':           `Bearer ${tokens.access_token}`,
        'developer-token':         devToken,
        'Content-Type':            'application/json',
      },
    }
  )

  let accounts: string[] = []
  if (accountsRes.ok) {
    const data = await accountsRes.json() as { resourceNames?: string[] }
    accounts = (data.resourceNames ?? []).map(r => r.replace('customers/', ''))
  }

  // If no accounts accessible, still save with a placeholder
  const primaryAccount = accounts[0] ?? 'unknown'

  // Fetch account name for the primary account
  let accountName = `Google Ads (${primaryAccount})`
  if (accounts[0]) {
    const nameRes = await fetch(
      `https://googleads.googleapis.com/v17/customers/${primaryAccount}`,
      {
        headers: {
          'Authorization':   `Bearer ${tokens.access_token}`,
          'developer-token': devToken,
        },
      }
    )
    if (nameRes.ok) {
      const nameData = await nameRes.json() as { descriptiveName?: string }
      if (nameData.descriptiveName) accountName = nameData.descriptiveName
    }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Save each accessible account (upsert)
  const accountsToSave = accounts.length > 0 ? accounts : [primaryAccount]
  for (const accountId of accountsToSave) {
    await admin.from('ad_platform_connections').upsert({
      workspace_id:     workspaceId,
      platform:         'google_ads',
      account_id:       accountId,
      account_name:     accountId === primaryAccount ? accountName : `Google Ads (${accountId})`,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      scopes:           tokens.scope,
      status:           'active',
      error_message:    null,
    }, {
      onConflict: 'workspace_id,platform,account_id',
    })
  }

  return NextResponse.redirect(`${appUrl}/dashboard?connection_success=google`)
}
