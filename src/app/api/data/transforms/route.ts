import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ─── GET — list transform rules for a workspace ─────────────────────────────

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: membership } = await admin
    .from('workspace_members').select('id')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: rules, error } = await admin
    .from('value_transform_rules')
    .select('id, field, rule_type, config, priority, is_active, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('field').order('priority', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: rules ?? [] })
}

// ─── POST — create or update a transform rule ───────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as {
    workspaceId: string
    id?: string            // if present → update
    field: string
    ruleType: string
    config: Record<string, unknown>
    priority?: number
    isActive?: boolean
  }

  const { workspaceId, id, field, ruleType, config, priority = 0, isActive = true } = body
  if (!workspaceId || !field || !ruleType) {
    return NextResponse.json({ error: 'workspaceId, field, ruleType required' }, { status: 400 })
  }

  const validTypes = ['mapping', 'format', 'scale', 'threshold', 'field_label']
  if (!validTypes.includes(ruleType)) {
    return NextResponse.json({ error: `ruleType must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Check admin role
  const { data: membership } = await admin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const row = {
    workspace_id: workspaceId,
    field,
    rule_type: ruleType,
    config,
    priority,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { data, error } = await admin
      .from('value_transform_rules')
      .update(row)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rule: data })
  }

  const { data, error } = await admin
    .from('value_transform_rules')
    .insert(row)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}

// ─── DELETE — remove a transform rule ────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { id, workspaceId } = await req.json() as { id: string; workspaceId: string }
  if (!id || !workspaceId) return NextResponse.json({ error: 'id and workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: membership } = await admin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { error } = await admin
    .from('value_transform_rules')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
