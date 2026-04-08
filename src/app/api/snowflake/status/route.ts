import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ connections: [] })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connections: [] })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Reset rows stuck in 'syncing' for more than 5 minutes (crashed/timed-out jobs)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  await admin
    .from('snowflake_connections')
    .update({ sync_status: 'idle', sync_progress: null, sync_total: null })
    .eq('workspace_id', workspaceId)
    .eq('sync_status', 'syncing')
    .lt('updated_at', staleThreshold)

  const { data } = await admin
    .from('snowflake_connections')
    .select('id, connection_name, table_name, last_synced_at, last_sync_rows, sync_status, sync_error, sync_progress, sync_total')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (!data || data.length === 0) return NextResponse.json({ connections: [] })

  return NextResponse.json({
    connections: data.map(c => ({
      id:             c.id,
      name:           c.connection_name ?? c.table_name,
      tableName:      c.table_name,
      lastSync:       c.last_synced_at,
      recordCount:    c.last_sync_rows,
      syncStatus:     c.sync_status ?? 'idle',
      syncError:      c.sync_error,
      syncProgress:   c.sync_progress ?? null,
      syncTotal:      c.sync_total ?? null,
    })),
  })
}
