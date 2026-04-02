import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testSnowflakeConnection, sampleSnowflakeTable, type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as {
    creds: SnowflakeCreds
    mapping: SnowflakeMapping
  }

  const { creds, mapping } = body

  if (!creds?.account || !creds?.username || !creds?.password || !creds?.warehouse) {
    return NextResponse.json({ error: 'Missing required credential fields' }, { status: 400 })
  }

  // Step 1: test connection
  const connResult = await testSnowflakeConnection(creds)
  if (!connResult.ok) {
    return NextResponse.json({ ok: false, step: 'connection', error: connResult.error }, { status: 200 })
  }

  // Step 2: sample the table if mapping provided
  if (mapping?.table && mapping?.colBrand && mapping?.colDate) {
    const sampleResult = await sampleSnowflakeTable(creds, mapping)
    if (!sampleResult.ok) {
      return NextResponse.json({ ok: false, step: 'table', error: sampleResult.error }, { status: 200 })
    }
    return NextResponse.json({ ok: true, sampleRows: sampleResult.rows?.length ?? 0 })
  }

  return NextResponse.json({ ok: true })
}
