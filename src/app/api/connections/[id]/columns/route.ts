import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { executeAction } from '@/lib/composio'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = admin()
  const { data: conn } = await db.from('connections').select('workspace_id, config').eq('id', id).single()
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: m } = await db.from('workspace_members').select('id')
    .eq('workspace_id', conn.workspace_id).eq('user_id', user.id).single()
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cfg = (conn.config ?? {}) as Record<string, string>
  const { database, schemaName, tableName } = cfg
  if (!database || !tableName) {
    return NextResponse.json({ error: 'Save database and table name first' }, { status: 400 })
  }

  try {
    const result = await executeAction(conn.workspace_id, 'SNOWFLAKE_BASIC_DESCRIBE_TABLE', {
      database,
      schema_name: schemaName ?? 'PUBLIC',
      table_name: tableName,
    }) as { data?: unknown }

    const raw = result?.data
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '')
    let rows: Record<string, unknown>[] = []
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) rows = parsed
      else if (Array.isArray(parsed?.data)) rows = parsed.data
      else if (Array.isArray(parsed?.rows)) rows = parsed.rows
    } catch { /* not JSON */ }

    const columns = rows
      .map(r => String(r.name ?? r.column_name ?? r.NAME ?? r.COLUMN_NAME ?? ''))
      .filter(Boolean)

    if (columns.length === 0) {
      // Fallback: SELECT * LIMIT 0 to get column names from result metadata
      const qResult = await executeAction(conn.workspace_id, 'SNOWFLAKE_BASIC_RUN_QUERY', {
        query: `SELECT * FROM "${tableName}" LIMIT 1`,
        database,
        schema_name: schemaName ?? 'PUBLIC',
      }) as { data?: unknown }

      const qRaw = qResult?.data
      const qStr = typeof qRaw === 'string' ? qRaw : JSON.stringify(qRaw ?? '')
      try {
        const qParsed = JSON.parse(qStr)
        const firstRow = Array.isArray(qParsed) ? qParsed[0]
          : Array.isArray(qParsed?.data) ? qParsed.data[0]
          : Array.isArray(qParsed?.rows) ? qParsed.rows[0]
          : null
        if (firstRow) {
          return NextResponse.json({ columns: Object.keys(firstRow) })
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ columns })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
