import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function authed() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return user
}

async function isMember(workspaceId: string, userId: string) {
  const { data } = await admin()
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', userId).single()
  return !!data
}

// GET /api/canvas-saves?workspaceId=
export async function GET(req: NextRequest) {
  const workspaceId = new URL(req.url).searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ saves: [] })
  const user = await authed()
  if (!user || !await isMember(workspaceId, user.id)) return NextResponse.json({ saves: [] }, { status: 403 })

  const { data } = await admin()
    .from('canvas_saves')
    .select('id, name, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ saves: data ?? [] })
}

// POST /api/canvas-saves  { workspaceId, name, nodes, edges }
export async function POST(req: NextRequest) {
  const { workspaceId, name, nodes, edges } = await req.json() as {
    workspaceId: string; name: string
    nodes: unknown[]; edges: unknown[]
  }
  if (!workspaceId || !name) return NextResponse.json({ error: 'workspaceId and name required' }, { status: 400 })
  const user = await authed()
  if (!user || !await isMember(workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin()
    .from('canvas_saves')
    .insert({ workspace_id: workspaceId, name: name.trim(), nodes, edges })
    .select('id, name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ save: data })
}

// GET /api/canvas-saves?workspaceId=&id= (load full state)
// handled above — add id filter when present
// Actually use a separate endpoint: GET /api/canvas-saves?workspaceId=&id=xxx
// Let's extend GET to handle this:

// DELETE /api/canvas-saves?id=&workspaceId=
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const workspaceId = url.searchParams.get('workspaceId')
  if (!id || !workspaceId) return NextResponse.json({ error: 'id and workspaceId required' }, { status: 400 })
  const user = await authed()
  if (!user || !await isMember(workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin().from('canvas_saves').delete().eq('id', id).eq('workspace_id', workspaceId)
  return NextResponse.json({ ok: true })
}
