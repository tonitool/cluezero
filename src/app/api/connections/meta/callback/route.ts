// GET /api/connections/meta/callback
// Meta redirects here. Exchange code → long-lived token → fetch ad accounts → save.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=meta_denied`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=meta_invalid`)
  }

  let workspaceId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    workspaceId = decoded.workspaceId
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=meta_state`)
  }

  const appId     = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${appUrl}/api/connections/meta/callback`

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code })
  )

  if (!tokenRes.ok) {
    console.error('Meta token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/dashboard?connection_error=meta_token`)
  }

  const shortToken = await tokenRes.json() as { access_token: string }

  // Exchange short-lived → long-lived token (60 days)
  const longTokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type:        'fb_exchange_token',
      client_id:         appId,
      client_secret:     appSecret,
      fb_exchange_token: shortToken.access_token,
    })
  )

  const longToken = longTokenRes.ok
    ? (await longTokenRes.json() as { access_token: string; expires_in?: number })
    : { access_token: shortToken.access_token, expires_in: 3600 }

  const expiresAt = longToken.expires_in
    ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days default

  // Fetch accessible ad accounts
  const accountsRes = await fetch(
    `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${longToken.access_token}`
  )

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (!accountsRes.ok) {
    // Save with unknown account as fallback
    await admin.from('ad_platform_connections').upsert({
      workspace_id:     workspaceId,
      platform:         'meta_ads',
      account_id:       'unknown',
      account_name:     'Meta Ads',
      access_token:     longToken.access_token,
      refresh_token:    null,
      token_expires_at: expiresAt,
      scopes:           'ads_read,ads_management',
      status:           'active',
      error_message:    null,
    }, { onConflict: 'workspace_id,platform,account_id' })
  } else {
    const accountsData = await accountsRes.json() as {
      data: { id: string; name: string; account_status: number }[]
    }

    // Save each accessible active ad account
    const activeAccounts = (accountsData.data ?? []).filter(a => a.account_status === 1)
    const toSave = activeAccounts.length > 0 ? activeAccounts : accountsData.data ?? []

    for (const account of toSave) {
      await admin.from('ad_platform_connections').upsert({
        workspace_id:     workspaceId,
        platform:         'meta_ads',
        account_id:       account.id, // already includes 'act_' prefix
        account_name:     account.name,
        access_token:     longToken.access_token,
        refresh_token:    null,
        token_expires_at: expiresAt,
        scopes:           'ads_read,ads_management,read_insights',
        status:           account.account_status === 1 ? 'active' : 'error',
        error_message:    account.account_status !== 1 ? `Account status: ${account.account_status}` : null,
      }, { onConflict: 'workspace_id,platform,account_id' })
    }

    // If no accounts were returned at all
    if (toSave.length === 0) {
      await admin.from('ad_platform_connections').upsert({
        workspace_id:     workspaceId,
        platform:         'meta_ads',
        account_id:       'no_accounts',
        account_name:     'Meta Ads (no active accounts)',
        access_token:     longToken.access_token,
        refresh_token:    null,
        token_expires_at: expiresAt,
        scopes:           'ads_read,ads_management',
        status:           'error',
        error_message:    'No active ad accounts found in this Business Manager',
      }, { onConflict: 'workspace_id,platform,account_id' })
    }
  }

  return NextResponse.redirect(`${appUrl}/dashboard?connection_success=meta`)
}
