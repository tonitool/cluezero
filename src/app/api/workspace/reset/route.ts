import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { workspaceId } = await req.json() as { workspaceId: string }
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Must be a workspace member
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get all ad IDs in this workspace
  const { data: ads } = await admin
    .from('ads')
    .select('id')
    .eq('workspace_id', workspaceId)

  const adIds = (ads ?? []).map(a => a.id)

  // Delete spend estimates and enrichments for those ads
  if (adIds.length > 0) {
    await admin.from('ad_spend_estimates').delete().in('ad_id', adIds)
    await admin.from('ad_enrichments').delete().in('ad_id', adIds)
  }

  // Delete all ads and tracked brands
  await admin.from('ads').delete().eq('workspace_id', workspaceId)
  await admin.from('tracked_brands').delete().eq('workspace_id', workspaceId)

  // Reset weekly_metrics if table exists
  await admin.from('weekly_metrics').delete().eq('workspace_id', workspaceId)

  // Reset all Snowflake connection sync state
  await admin
    .from('connections')
    .update({
      sync_status:    'idle',
      sync_error:     null,
      last_sync_at: null,
      last_sync_rows: null,
      updated_at:     new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('app_name', 'snowflake')
    .eq('app_name', 'snowflake')

  return NextResponse.json({ ok: true })
}
