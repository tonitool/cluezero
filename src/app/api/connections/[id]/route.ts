/**
 * PATCH /api/connections/[id]  — update name or config
 * GET   /api/connections/[id]  — fetch single connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = admin()
  const { data, error } = await db
    .from('connections').select('*').eq('id', id).single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify membership
  const { data: m } = await db.from('workspace_members').select('id')
    .eq('workspace_id', data.workspace_id).eq('user_id', user.id).single()
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ connection: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as {
    name?: string
    config?: Record<string, unknown>
  }

  const db = admin()

  // Find the connection first to verify workspace membership
  const { data: conn } = await db
    .from('connections').select('workspace_id').eq('id', id).single()
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: m } = await db.from('workspace_members').select('role')
    .eq('workspace_id', conn.workspace_id).eq('user_id', user.id).single()
  if (!m || !['owner', 'admin'].includes(m.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name   !== undefined) patch.name   = body.name
  if (body.config !== undefined) patch.config = body.config

  const { data: updated, error } = await db
    .from('connections').update(patch).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connection: updated })
}
