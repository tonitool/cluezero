import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * PATCH /api/widgets/[id]
 * Update a single widget config.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as {
    workspaceId: string
    title?: string
    sqlQuery?: string
    chartType?: string
    colSpan?: number
    position?: number
    isVisible?: boolean
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: existing } = await admin()
    .from('workspace_widget_configs').select('workspace_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await admin()
    .from('workspace_members').select('role')
    .eq('workspace_id', existing.workspace_id).eq('user_id', user.id).single()
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title      !== undefined) updates.title      = body.title
  if (body.sqlQuery   !== undefined) updates.sql_query  = body.sqlQuery
  if (body.chartType  !== undefined) updates.chart_type = body.chartType
  if (body.colSpan    !== undefined) updates.col_span   = body.colSpan
  if (body.position   !== undefined) updates.position   = body.position
  if (body.isVisible  !== undefined) updates.is_visible = body.isVisible

  const { data, error } = await admin()
    .from('workspace_widget_configs').update(updates).eq('id', id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ widget: data })
}

/**
 * DELETE /api/widgets/[id]
 * Delete a widget config (SQL widgets only — built-ins can just be hidden).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: existing } = await admin()
    .from('workspace_widget_configs').select('workspace_id, type').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await admin()
    .from('workspace_members').select('role')
    .eq('workspace_id', existing.workspace_id).eq('user_id', user.id).single()
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await admin().from('workspace_widget_configs').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
