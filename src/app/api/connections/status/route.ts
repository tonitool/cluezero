/**
 * GET /api/connections/status?workspaceId=&connectionId=
 *
 * Polls the status of a pending connection.
 * Used after initiating OAuth — client polls until status = 'active'.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getConnectionStatus } from '@/lib/composio'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const workspaceId  = p.get('workspaceId')
  const connectionId = p.get('connectionId')  // our DB id

  if (!workspaceId || !connectionId) {
    return NextResponse.json({ error: 'workspaceId and connectionId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await admin
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

  // Already active — return immediately
  if (conn.status === 'active') {
    return NextResponse.json({ status: 'active', connection: conn })
  }

  // No Composio connection ID yet — still pending
  if (!conn.composio_connection_id) {
    return NextResponse.json({ status: 'pending', connection: conn })
  }

  // Poll Composio by connectedAccountId
  try {
    const { status } = await getConnectionStatus(conn.composio_connection_id)

    if (status === 'active') {
      const { data: updated } = await admin
        .from('connections')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', connectionId)
        .select()
        .single()
      return NextResponse.json({ status: 'active', connection: updated })
    }

    return NextResponse.json({ status, connection: conn })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
