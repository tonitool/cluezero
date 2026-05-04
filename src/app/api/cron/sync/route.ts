import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncConnection } from '@/lib/sync-connection'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all active Snowflake connections that are not currently syncing
  const { data: connections } = await admin
    .from('connections')
    .select('id, workspace_id, name, config')
    .eq('app_name', 'snowflake')
    .eq('status', 'active')
    .neq('sync_status', 'syncing')

  if (!connections || connections.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: 'No connections to sync' })
  }

  const results = []
  for (const conn of connections) {
    const result = await syncConnection(conn.id, conn.workspace_id)
    results.push({ connectionId: conn.id, name: conn.name ?? 'Snowflake', ...result })
  }

  return NextResponse.json({ ok: true, synced: results.length, results })
}
