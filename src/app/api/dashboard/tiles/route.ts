// GET    /api/dashboard/tiles?workspaceId=
// POST   /api/dashboard/tiles         { workspaceId, title, metricA, metricB, dimension, chartType, filters, weekRange, colSpan }
// PATCH  /api/dashboard/tiles         { workspaceId, id?, title?, colSpan?, filters?, positions?: [{id,position}] }
// DELETE /api/dashboard/tiles?id=&workspaceId=

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

  const { data: tiles } = await admin()
    .from('dashboard_tiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })

  return NextResponse.json({ tiles: tiles ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    workspaceId:  string
    dashboardId?: string
    title:        string
    metricA:      string
    metricB?:     string
    dimension:    string
    chartType:    string
    filters?:     Record<string, unknown>
    weekRange?:   number
    colSpan?:     number
  }

  if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  if (!await checkMembership(body.workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get current max position
  const { data: existing } = await admin()
    .from('dashboard_tiles')
    .select('position')
    .eq('workspace_id', body.workspaceId)
    .order('position', { ascending: false })
    .limit(1)

  const position = existing?.[0]?.position != null ? existing[0].position + 1 : 0

  const { data: tile, error } = await admin()
    .from('dashboard_tiles')
    .insert({
      workspace_id: body.workspaceId,
      dashboard_id: body.dashboardId ?? null,
      title:        body.title,
      metric_a:     body.metricA,
      metric_b:     body.metricB ?? null,
      dimension:    body.dimension,
      chart_type:   body.chartType,
      filters:      body.filters ?? {},
      week_range:   body.weekRange ?? 4,
      col_span:     body.colSpan ?? 1,
      position,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tile })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    workspaceId: string
    // Single-tile update
    id?:      string
    title?:   string
    colSpan?: number
    filters?: Record<string, unknown>
    // Bulk position reorder
    positions?: { id: string; position: number }[]
  }

  if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  if (!await checkMembership(body.workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Bulk reorder
  if (body.positions?.length) {
    await Promise.all(
      body.positions.map(({ id, position }) =>
        admin().from('dashboard_tiles').update({ position }).eq('id', id).eq('workspace_id', body.workspaceId)
      )
    )
    return NextResponse.json({ ok: true })
  }

  // Single-tile update
  if (!body.id) return NextResponse.json({ error: 'id required for single-tile update' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title   !== undefined) patch.title    = body.title
  if (body.colSpan !== undefined) patch.col_span = body.colSpan
  if (body.filters !== undefined) patch.filters  = body.filters

  const { error } = await admin()
    .from('dashboard_tiles').update(patch).eq('id', body.id).eq('workspace_id', body.workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  await admin().from('dashboard_tiles').delete().eq('id', id).eq('workspace_id', workspaceId)
  return NextResponse.json({ ok: true })
}
