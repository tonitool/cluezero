import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as {
    workspaceId: string
    creds: SnowflakeCreds
    mapping: SnowflakeMapping
  }

  const { workspaceId, creds, mapping } = body

  if (!workspaceId || !creds || !mapping) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the user is a member of this workspace
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
  }

  const { error } = await admin
    .from('snowflake_connections')
    .upsert({
      workspace_id:    workspaceId,
      account:         creds.account,
      username:        creds.username,
      password:        creds.password,
      role:            creds.role ?? null,
      warehouse:       creds.warehouse,
      database:        creds.database,
      schema:          creds.schema,
      table_name:      mapping.table,
      col_brand:       mapping.colBrand,
      col_date:        mapping.colDate,
      col_headline:    mapping.colHeadline ?? null,
      col_spend:       mapping.colSpend ?? null,
      col_impressions: mapping.colImpressions ?? null,
      col_reach:       mapping.colReach ?? null,
      col_pi:          mapping.colPi ?? null,
      col_funnel:      mapping.colFunnel ?? null,
      col_topic:       mapping.colTopic ?? null,
      sync_status:     'idle',
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'workspace_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
