import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [brands, ads, estimates, sfConn] = await Promise.all([
    admin.from('tracked_brands').select('id, name, platform').eq('workspace_id', workspaceId),
    admin.from('ads').select('id, ad_id, headline, first_seen_at').eq('workspace_id', workspaceId),
    admin.from('ad_spend_estimates').select('ad_id, week_start, est_spend_eur, est_reach'),
    admin.from('snowflake_connections').select('last_sync_rows, sync_status, sync_error, last_synced_at').eq('workspace_id', workspaceId).single(),
  ])

  return NextResponse.json({
    snowflake_connection: sfConn.data,
    tracked_brands:  { count: brands.data?.length ?? 0, rows: brands.data, error: brands.error?.message },
    ads:             { count: ads.data?.length ?? 0, rows: ads.data?.slice(0, 5), error: ads.error?.message },
    spend_estimates: { count: estimates.data?.length ?? 0, error: estimates.error?.message },
  })
}
