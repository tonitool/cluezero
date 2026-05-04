import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workspaceId = new URL(req.url).searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mem } = await admin()
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!mem) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin()
    .from('canvas_saves')
    .select('id, name, nodes, edges, created_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ save: data })
}
