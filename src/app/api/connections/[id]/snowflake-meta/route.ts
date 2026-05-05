/**
 * GET /api/connections/[id]/snowflake-meta
 *
 * Returns Snowflake metadata for the given connection.
 * Query params:
 *   type=databases
 *   type=schemas&database=X
 *   type=tables&database=X&schema=Y
 *   type=columns&database=X&schema=Y&table=Z
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { executeAction } from '@/lib/composio'

const SF_VERSION = '20260407_00'

/** Extract a list of name strings from any Composio action response shape. */
function extractNames(raw: unknown, keys: string[]): string[] {
  // raw may be: string (JSON), array, or object with .data / .response / .rows
  const candidates: unknown[] = []

  function tryArray(val: unknown) {
    if (Array.isArray(val)) { candidates.push(...val); return true }
    return false
  }

  function tryParse(val: unknown): unknown {
    if (typeof val === 'string') {
      try { return JSON.parse(val) } catch { return null }
    }
    return val
  }

  const parsed = tryParse(raw)
  if (!tryArray(parsed)) {
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const inner = obj.data ?? obj.rows ?? obj.response ?? obj.result
      const parsedInner = tryParse(inner)
      if (!tryArray(parsedInner)) tryArray(inner)
    }
  }

  return candidates.map(row => {
    if (typeof row === 'string') return row
    if (row && typeof row === 'object') {
      const r = row as Record<string, unknown>
      for (const k of keys) {
        if (typeof r[k] === 'string' && r[k]) return r[k] as string
      }
      // fallback: first string value
      for (const v of Object.values(r)) {
        if (typeof v === 'string' && v) return v
      }
    }
    return ''
  }).filter(Boolean)
}

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const p = req.nextUrl.searchParams
  const type = p.get('type')
  const database = p.get('database') ?? ''
  const schema = p.get('schema') ?? ''
  const table = p.get('table') ?? ''

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch connection to get workspaceId and verify ownership
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: conn } = await admin
    .from('connections')
    .select('workspace_id, app_name, status')
    .eq('id', id)
    .single()

  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  if (conn.status !== 'active') return NextResponse.json({ error: 'Connection not active' }, { status: 400 })

  const workspaceId = conn.workspace_id

  try {
    if (type === 'databases') {
      const raw = await executeAction(workspaceId, 'SNOWFLAKE_BASIC_SHOW_DATABASES', {}, SF_VERSION)
      console.log('[snowflake-meta] SHOW_DATABASES raw:', JSON.stringify(raw).slice(0, 500))
      const items = extractNames(raw, ['name', 'DATABASE_NAME', 'database_name'])
      return NextResponse.json({ items })
    }
    if (type === 'schemas' && database) {
      const raw = await executeAction(workspaceId, 'SNOWFLAKE_BASIC_SHOW_SCHEMAS', { database }, SF_VERSION)
      console.log('[snowflake-meta] SHOW_SCHEMAS raw:', JSON.stringify(raw).slice(0, 500))
      const items = extractNames(raw, ['name', 'SCHEMA_NAME', 'schema_name'])
      return NextResponse.json({ items })
    }
    if (type === 'tables' && database && schema) {
      const raw = await executeAction(workspaceId, 'SNOWFLAKE_BASIC_SHOW_TABLES', { database, schema_name: schema }, SF_VERSION)
      console.log('[snowflake-meta] SHOW_TABLES raw:', JSON.stringify(raw).slice(0, 500))
      const items = extractNames(raw, ['name', 'TABLE_NAME', 'table_name'])
      return NextResponse.json({ items })
    }
    if (type === 'columns' && database && schema && table) {
      const raw = await executeAction(workspaceId, 'SNOWFLAKE_BASIC_DESCRIBE_TABLE', {
        database,
        schema_name: schema,
        table_name: table,
      }, SF_VERSION)
      console.log('[snowflake-meta] DESCRIBE_TABLE raw:', JSON.stringify(raw).slice(0, 500))
      const items = extractNames(raw, ['name', 'COLUMN_NAME', 'column_name'])
      return NextResponse.json({ items })
    }
    return NextResponse.json({ error: 'Invalid type or missing params' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch metadata'
    console.error('[snowflake-meta] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
