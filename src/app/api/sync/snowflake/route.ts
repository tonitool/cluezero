import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncConnection } from '@/lib/sync-connection'

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

  // Concurrency guard: reject if already syncing
  const { data: conn } = await db
    .from('snowflake_connections')
    .select('sync_status')
    .eq('id', connectionId)
    .single()

  if (conn?.sync_status === 'syncing') {
    return NextResponse.json({ started: false, reason: 'already_syncing' })
  }

  // Mark as syncing immediately so the UI shows progress right away
  await db
    .from('snowflake_connections')
    .update({
      sync_status: 'syncing',
      sync_error: null,
      sync_progress: null,
      sync_total: null,
    })
    .eq('id', connectionId)

  // Run the sync in the background — HTTP response returns immediately.
  // The user can navigate away; status is polled via /api/snowflake/status.
  after(async () => {
    try {
      await syncConnection(connectionId, workspaceId)
      // syncConnection already writes final status to the DB, so we don't
      // need to duplicate the update here.
    } catch (err) {
      // Unexpected crash — make sure we don't leave status stuck on 'syncing'
      console.error('[sync] Unhandled error:', err)
      await db
        .from('snowflake_connections')
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
