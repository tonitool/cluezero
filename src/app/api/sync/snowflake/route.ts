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

  const { data: membership } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
      { error: 'Enter the database and table name, then click "Load columns" to set up the mapping.' },
      { status: 400 },
    )
  }
  if (!cfg.colBrand || !cfg.colDate) {
    return NextResponse.json(
      { error: 'Select Brand and Date columns before syncing.' },
      { status: 400 },
    )
  }

  await db
    .from('connections')
    .update({ sync_status: 'syncing', sync_error: null, sync_progress: null, sync_total: null })
    .eq('id', connectionId)

  after(async () => {
    try {
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
