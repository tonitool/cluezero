import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncConnection } from '@/lib/sync-connection'
import { autoMapSnowflakeColumns } from '@/lib/snowflake-automap'

// Allow up to 5 minutes for the background sync on Vercel Pro
export const maxDuration = 300

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { workspaceId, connectionId } = (await req.json()) as {
    workspaceId: string
    connectionId: string
  }
  if (!workspaceId || !connectionId)
    return NextResponse.json({ error: 'workspaceId and connectionId required' }, { status: 400 })

  const db = admin()

  // Verify membership
  const { data: membership } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Need at minimum a table location to sync
  const { data: conn } = await db
    .from('connections')
    .select('sync_status, config')
    .eq('id', connectionId)
    .single()

  if (conn?.sync_status === 'syncing') {
    return NextResponse.json({ started: false, reason: 'already_syncing' })
  }

  const cfg = (conn?.config ?? {}) as Record<string, string>
  if (!cfg.database || !cfg.tableName) {
    return NextResponse.json(
      { error: 'Enter the database and table name before syncing.' },
      { status: 400 },
    )
  }

  // Mark as syncing immediately so the UI shows progress right away
  await db
    .from('connections')
    .update({
      sync_status: 'syncing',
      sync_error: null,
      sync_progress: null,
      sync_total: null,
    })
    .eq('id', connectionId)

  // Run the sync in the background — HTTP response returns immediately.
  after(async () => {
    try {
      // Re-read config (may have changed since the request)
      const { data: fresh } = await db
        .from('connections')
        .select('config')
        .eq('id', connectionId)
        .single()

      const c = (fresh?.config ?? {}) as Record<string, string>

      // Auto-detect column mapping if not already set
      if (!c.colBrand || !c.colDate) {
        await db.from('connections')
          .update({ sync_error: 'Detecting column mapping…' })
          .eq('id', connectionId)

        const detected = await autoMapSnowflakeColumns(
          workspaceId,
          c.database,
          c.schemaName ?? 'PUBLIC',
          c.tableName,
        )

        if (!detected) {
          await db.from('connections').update({
            sync_status: 'error',
            sync_error: 'Could not detect brand/date columns. Please set column mapping manually.',
            updated_at: new Date().toISOString(),
          }).eq('id', connectionId)
          return
        }

        await db.from('connections').update({
          config: { ...c, ...detected },
          sync_error: null,
          updated_at: new Date().toISOString(),
        }).eq('id', connectionId)

        console.log('[sync] Auto-mapped columns:', detected)
      }

      await syncConnection(connectionId, workspaceId)
    } catch (err) {
      console.error('[sync] Unhandled error:', err)
      await db
        .from('connections')
        .update({
          sync_status: 'error',
          sync_error: String(err),
          sync_progress: null,
          sync_total: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
    }
  })

  return NextResponse.json({ started: true })
}
