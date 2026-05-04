/**
 * GET /api/connections/callback
 *
 * Composio redirects here after a user completes OAuth.
 * Query params: status, connectedAccountId, appName
 *
 * Updates the connection status to 'active' and redirects
 * the user back to the dashboard Connections page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const status             = p.get('status')             // 'success' | 'error'
  const connectedAccountId = p.get('connectedAccountId') // Composio connection UUID
  const appName            = p.get('appName')

  const origin = req.nextUrl.origin
  const redirectBase = `${origin}/dashboard`

  // If Composio reported an error, redirect with a message
  if (status !== 'success' || !connectedAccountId) {
    return NextResponse.redirect(`${redirectBase}?connection=error&app=${appName ?? ''}`)
  }

  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Find the pending connection by Composio's connectedAccountId
    const { data: conn } = await admin
      .from('connections')
      .select('id, workspace_id')
      .eq('composio_connection_id', connectedAccountId)
      .single()

    if (conn) {
      await admin
        .from('connections')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id)
    }
  } catch {
    // Don't block the redirect even if DB update fails — UI polls separately
  }

  // Redirect back to the dashboard; the Connections view will show the active state
  return NextResponse.redirect(`${redirectBase}?connection=success&app=${appName ?? ''}`)
}
