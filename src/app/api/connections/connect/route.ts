/**
 * POST /api/connections/connect
 *
 * Initiates a Composio OAuth connection for a workspace + app.
 * Returns a redirectUrl the client opens for the user to complete auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { initiateConnection } from '@/lib/composio'
import { SUPPORTED_CONNECTORS } from '@/lib/connectors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as {
    workspaceId: string
    appName: string
    name?: string
    params?: Record<string, string>   // e.g. { subdomain: 'myorg-myaccount' } for Snowflake
  }

  const { workspaceId, appName, name, params = {} } = body

  if (!workspaceId || !appName) {
    return NextResponse.json({ error: 'workspaceId and appName required' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: membership } = await admin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const app = SUPPORTED_CONNECTORS.find(a => a.key === appName)

  try {
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
    const redirectUri = `${origin}/api/connections/callback`

    const result = await initiateConnection(workspaceId, appName, params, redirectUri)

    const connName = name || `${app?.displayName ?? appName} — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

    const { data: conn, error: dbErr } = await admin
      .from('connections')
      .insert({
        workspace_id: workspaceId,
        name: connName,
        app_name: appName,
        logo_url: app?.logo ?? null,
        composio_entity_id: workspaceId,
        composio_connection_id: result.connectionId || null,
        status: result.status === 'active' ? 'active' : 'pending',
        config: params,
      })
      .select()
      .single()

    if (dbErr) throw new Error(dbErr.message)

    return NextResponse.json({
      connectionId: conn.id,
      composioConnectionId: result.connectionId,
      redirectUrl: result.redirectUrl,
      status: conn.status,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initiate connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
