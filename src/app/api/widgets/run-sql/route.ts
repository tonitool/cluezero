import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/widgets/run-sql
 *
 * Executes a SELECT query against the workspace's data and returns rows.
 * Used both for live SQL widget rendering and for preview in the editor.
 *
 * Security:
 *  - Only SELECT statements are allowed
 *  - {{workspaceId}} template variable is replaced before execution
 *  - Results capped at 500 rows
 *  - Caller must be a member of the workspace
 *
 * Body: { workspaceId: string; sql: string }
 */

const FORBIDDEN_KEYWORDS = [
  'insert', 'update', 'delete', 'drop', 'alter', 'create',
  'truncate', 'grant', 'revoke', 'execute', 'call', 'do',
  'copy', 'vacuum', 'analyze', 'cluster',
]

function validateSql(sql: string): { ok: boolean; error?: string } {
  const normalized = sql.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
    return { ok: false, error: 'Only SELECT (or WITH…SELECT) statements are allowed.' }
  }
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(normalized)) {
      return { ok: false, error: `"${kw.toUpperCase()}" is not allowed in widget queries.` }
    }
  }
  return { ok: true }
}

export async function POST(req: NextRequest) {
  const { workspaceId, sql } = await req.json() as { workspaceId: string; sql: string }

  if (!workspaceId || !sql?.trim()) {
    return NextResponse.json({ error: 'workspaceId and sql are required' }, { status: 400 })
  }

  // Auth
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify workspace membership
  const { data: membership } = await adminClient
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Validate SQL
  const validation = validateSql(sql)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  // Replace template variables and strip trailing semicolons
  const resolvedSql = sql
    .replace(/\{\{workspaceId\}\}/g, `'${workspaceId}'`)
    .trim()
    .replace(/;+\s*$/, '')

  // Wrap in a LIMIT so we never return massive result sets
  const limitedSql = /\blimit\b/i.test(resolvedSql)
    ? resolvedSql
    : `SELECT * FROM (${resolvedSql}) __q LIMIT 500`

  // Execute via Supabase RPC (raw SQL using service role)
  // We use the Postgres REST API via a helper function
  const { data, error } = await adminClient.rpc('run_widget_sql', {
    p_workspace_id: workspaceId,
    p_sql: limitedSql,
  })

  if (error) {
    // Fall back to a more informative error
    return NextResponse.json(
      { error: error.message.replace(/\n/g, ' ') },
      { status: 400 }
    )
  }

  return NextResponse.json({ rows: data ?? [], rowCount: (data ?? []).length })
}
