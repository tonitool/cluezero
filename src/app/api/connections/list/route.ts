import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: adConnections, error }, { data: productivityConnections }] = await Promise.all([
    admin
      .from('ad_platform_connections')
      .select('id, platform, account_id, account_name, status, error_message, connected_at, last_used_at, token_expires_at')
      .eq('workspace_id', workspaceId)
      .order('connected_at', { ascending: false }),
    admin
      .from('productivity_connections')
      .select('id, platform, account_name, config, status, error_message, created_at, updated_at')
      .eq('workspace_id', workspaceId),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also return env flags so frontend knows which platforms are configured
  return NextResponse.json({
    connections:             adConnections ?? [],
    productivityConnections: productivityConnections ?? [],
    configured: {
      google_ads: !!(process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
      meta_ads:   !!(process.env.META_APP_ID),
    },
  })
}
