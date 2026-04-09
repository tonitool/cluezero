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
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

async function checkMembership(workspaceId: string, userId: string, requireWrite = false) {
  const { data } = await admin()
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', userId).single()
  if (!data) return false
  if (requireWrite && !['owner', 'admin'].includes(data.role)) return false
  return true
}

/**
 * GET /api/widgets?workspaceId=&tab=
 * Returns all widget configs for a workspace+tab, sorted by position.
 */
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  const tab         = req.nextUrl.searchParams.get('tab')
  if (!workspaceId || !tab) return NextResponse.json({ error: 'workspaceId and tab required' }, { status: 400 })

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!await checkMembership(workspaceId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin()
    .from('workspace_widget_configs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('tab', tab)
    .order('position', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ widgets: data ?? [] })
}

/**
 * POST /api/widgets
 * Create a new SQL widget (or upsert a built-in config override).
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    workspaceId: string
    tab: string
    widgetId?: string
    type?: 'builtin' | 'sql'
    title?: string
    sqlQuery?: string
    chartType?: string
    colSpan?: number
    position?: number
    isVisible?: boolean
  }

  const { workspaceId, tab } = body
  if (!workspaceId || !tab) return NextResponse.json({ error: 'workspaceId and tab required' }, { status: 400 })

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!await checkMembership(workspaceId, user.id, true)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // For SQL widgets, assign a new UUID as widget_id
  const widgetId = body.widgetId ?? crypto.randomUUID()
  const type = body.type ?? 'sql'

  const { data, error } = await admin()
    .from('workspace_widget_configs')
    .upsert({
      workspace_id: workspaceId,
      tab,
      widget_id:   widgetId,
      type,
      title:       body.title ?? null,
      sql_query:   body.sqlQuery ?? null,
      chart_type:  body.chartType ?? 'table',
      col_span:    body.colSpan ?? 2,
      position:    body.position ?? 999,
      is_visible:  body.isVisible ?? true,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'workspace_id,tab,widget_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ widget: data })
}

/**
 * PATCH /api/widgets
 * Bulk update positions/visibility for multiple widgets.
 * Body: { workspaceId, updates: [{ id, position?, isVisible? }] }
 */
export async function PATCH(req: NextRequest) {
  const { workspaceId, updates } = await req.json() as {
    workspaceId: string
    updates: { id: string; position?: number; isVisible?: boolean; title?: string }[]
  }

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!await checkMembership(workspaceId, user.id, true)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await Promise.all(
    (updates ?? []).map(u =>
      admin().from('workspace_widget_configs')
        .update({
          ...(u.position  !== undefined && { position:   u.position }),
          ...(u.isVisible !== undefined && { is_visible: u.isVisible }),
          ...(u.title     !== undefined && { title:      u.title }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', u.id)
        .eq('workspace_id', workspaceId)
    )
  )

  return NextResponse.json({ ok: true })
}
