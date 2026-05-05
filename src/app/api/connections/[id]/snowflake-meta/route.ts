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
import {
  listDatabases,
  listSchemas,
  listTables,
  fetchTableColumnsComposio,
} from '@/lib/snowflake'

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
      const items = await listDatabases(workspaceId)
      return NextResponse.json({ items })
    }
    if (type === 'schemas' && database) {
      const items = await listSchemas(workspaceId, database)
      return NextResponse.json({ items })
    }
    if (type === 'tables' && database && schema) {
      const items = await listTables(workspaceId, database, schema)
      return NextResponse.json({ items })
    }
    if (type === 'columns' && database && schema && table) {
      const result = await fetchTableColumnsComposio(workspaceId, database, schema, table)
      return NextResponse.json({ items: result.columns ?? [], error: result.error })
    }
    return NextResponse.json({ error: 'Invalid type or missing params' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch metadata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
