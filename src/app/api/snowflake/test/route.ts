import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testSnowflakeConnection, fetchTableColumns, sampleSnowflakeTable, type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as {
    creds: SnowflakeCreds
    table?: string
    mapping?: SnowflakeMapping
  }

  const { creds, table, mapping } = body

  if (!creds?.account || !creds?.username || !creds?.password || !creds?.warehouse) {
    return NextResponse.json({ error: 'Missing required credential fields' }, { status: 400 })
  }

  // Step 1: test connection
  const connResult = await testSnowflakeConnection(creds)
  if (!connResult.ok) {
    return NextResponse.json({ ok: false, step: 'connection', error: connResult.error }, { status: 200 })
  }

  // Column detection mode: table provided but no full mapping
  if (table && !(mapping?.colBrand && mapping?.colDate)) {
    const colResult = await fetchTableColumns(creds, table)
    if (!colResult.ok) {
      return NextResponse.json({ ok: false, step: 'table', error: colResult.error }, { status: 200 })
    }
    return NextResponse.json({ ok: true, columns: colResult.columns ?? [] })
  }

  // Full test mode: sample the table with mapping
  if (mapping?.table && mapping?.colBrand && mapping?.colDate) {
    const sampleResult = await sampleSnowflakeTable(creds, mapping)
    if (!sampleResult.ok) {
      return NextResponse.json({ ok: false, step: 'table', error: sampleResult.error }, { status: 200 })
    }
    return NextResponse.json({ ok: true, sampleRows: sampleResult.rows?.length ?? 0 })
  }

  return NextResponse.json({ ok: true })
}
