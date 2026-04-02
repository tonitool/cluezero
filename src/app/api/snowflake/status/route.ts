import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ connected: false })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await admin
    .from('snowflake_connections')
    .select('last_synced_at, last_sync_rows, sync_status')
    .eq('workspace_id', workspaceId)
    .single()

  if (!data) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected: true,
    lastSync: data.last_synced_at,
    recordCount: data.last_sync_rows,
    syncStatus: data.sync_status,
  })
}
