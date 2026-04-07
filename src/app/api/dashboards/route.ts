// GET    /api/dashboards?workspaceId=
// POST   /api/dashboards  { workspaceId, name }
// PATCH  /api/dashboards  { workspaceId, id, name }
// DELETE /api/dashboards?id=&workspaceId=

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkMembership(workspaceId: string, userId: string) {
  const { data } = await admin()
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', userId).single()
  return !!data
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  if (!await checkMembership(workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: dashboards } = await admin()
    .from('dashboards')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })

  return NextResponse.json({ dashboards: dashboards ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, name } = await req.json() as { workspaceId: string; name: string }
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  if (!await checkMembership(workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existing } = await admin()
    .from('dashboards').select('position').eq('workspace_id', workspaceId)
    .order('position', { ascending: false }).limit(1)
  const position = existing?.[0]?.position != null ? existing[0].position + 1 : 0

  const { data: dashboard, error } = await admin()
    .from('dashboards')
    .insert({ workspace_id: workspaceId, name: name || 'Untitled Dashboard', position })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dashboard })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id, name } = await req.json() as { workspaceId: string; id: string; name: string }
  if (!workspaceId || !id) return NextResponse.json({ error: 'workspaceId and id required' }, { status: 400 })
  if (!await checkMembership(workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin().from('dashboards')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id).eq('workspace_id', workspaceId)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id          = req.nextUrl.searchParams.get('id')
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!id || !workspaceId) return NextResponse.json({ error: 'id and workspaceId required' }, { status: 400 })
  if (!await checkMembership(workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin().from('dashboards').delete().eq('id', id).eq('workspace_id', workspaceId)
  return NextResponse.json({ ok: true })
}
