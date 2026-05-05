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
  _req: NextRequest,
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
  const steps: { step: string; ok: boolean; detail: string }[] = []

  // Step 1: SHOW DATABASES — most basic call, no warehouse needed
  try {
    const result = await executeAction(conn.workspace_id, 'SNOWFLAKE_BASIC_SHOW_DATABASES', {})
    steps.push({ step: 'SHOW DATABASES', ok: true, detail: JSON.stringify(result).slice(0, 200) })
  } catch (err) {
    steps.push({ step: 'SHOW DATABASES', ok: false, detail: String(err) })
    return NextResponse.json({ steps })
  }

  // Step 2: DESCRIBE TABLE
  if (cfg.database && cfg.schemaName && cfg.tableName) {
    try {
      const result = await executeAction(conn.workspace_id, 'SNOWFLAKE_BASIC_DESCRIBE_TABLE', {
        database: cfg.database,
        schema_name: cfg.schemaName ?? 'PUBLIC',
        table_name: cfg.tableName,
      })
      steps.push({ step: 'DESCRIBE TABLE', ok: true, detail: JSON.stringify(result).slice(0, 200) })
    } catch (err) {
      steps.push({ step: 'DESCRIBE TABLE', ok: false, detail: String(err) })
      return NextResponse.json({ steps })
    }
  }

  // Step 3: Simple SELECT
  if (cfg.database && cfg.tableName) {
    const fqTable = `"${cfg.database}"."${cfg.schemaName ?? 'PUBLIC'}"."${cfg.tableName}"`
    try {
      const result = await executeAction(conn.workspace_id, 'SNOWFLAKE_BASIC_RUN_QUERY', {
        query: `SELECT * FROM ${fqTable} LIMIT 1`,
        database: cfg.database,
        schema_name: cfg.schemaName ?? 'PUBLIC',
      })
      steps.push({ step: 'SELECT LIMIT 1', ok: true, detail: JSON.stringify(result).slice(0, 200) })
    } catch (err) {
      steps.push({ step: 'SELECT LIMIT 1', ok: false, detail: String(err) })
    }
  }

  return NextResponse.json({ steps })
}
