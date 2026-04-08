import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncConnection } from '@/lib/sync-connection'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { workspaceId, connectionId } = await req.json() as { workspaceId: string; connectionId: string }
  if (!workspaceId || !connectionId) return NextResponse.json({ error: 'workspaceId and connectionId required' }, { status: 400 })

  const db = admin()

  // Verify membership
  const { data: membership } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Mark as syncing immediately so the UI can reflect it right away
  await db
    .from('snowflake_connections')
    .update({ sync_status: 'syncing', sync_error: null, sync_progress: null, sync_total: null })
    .eq('id', connectionId)

  // Run the actual sync in the background — response returns immediately
  // so the user can navigate away freely while sync continues.
  after(async () => {
    try {
      const result = await syncConnection(connectionId, workspaceId)
      const firstError = result.errors.length > 0 ? result.errors[0] : null
      await db
        .from('snowflake_connections')
        .update({
          sync_status:    'idle',
          last_synced_at: new Date().toISOString(),
          last_sync_rows: result.inserted ?? 0,
          sync_error:     !result.ok
            ? (firstError ?? 'Sync failed')
            : result.inserted === 0 && firstError
              ? firstError
              : null,
        })
        .eq('id', connectionId)
    } catch (err) {
      await db
        .from('snowflake_connections')
        .update({ sync_status: 'error', sync_error: String(err) })
        .eq('id', connectionId)
    }
  })

  return NextResponse.json({ started: true })
}
