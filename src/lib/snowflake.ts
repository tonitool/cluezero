import snowflake from 'snowflake-sdk'

export type SnowflakeCreds = {
  account: string
  username: string
  // One of password OR privateKey must be provided
  password?: string
  privateKey?: string      // PEM content of the RSA private key
  privateKeyPass?: string  // passphrase if the private key is encrypted
  role?: string
  warehouse: string
  database: string
  schema: string
}

export type SnowflakeMapping = {
  table: string
  colBrand: string
  colDate: string
  colHeadline?: string
  colSpend?: string
  colImpressions?: string
  colReach?: string
  colPi?: string
  colFunnel?: string
  colTopic?: string
}

function makeConnection(creds: SnowflakeCreds) {
  const base = {
    account:   creds.account,
    username:  creds.username,
    role:      creds.role || undefined,
    warehouse: creds.warehouse,
    database:  creds.database,
    schema:    creds.schema,
  }

  if (creds.privateKey) {
    return snowflake.createConnection({
      ...base,
      authenticator:  'SNOWFLAKE_JWT',
      privateKey:     creds.privateKey,
      privateKeyPass: creds.privateKeyPass || undefined,
    })
  }

  return snowflake.createConnection({ ...base, password: creds.password })
}

export async function testSnowflakeConnection(
  creds: SnowflakeCreds
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const conn = makeConnection(creds)
    conn.connect((err) => {
      if (err) {
        resolve({ ok: false, error: err.message })
        return
      }
      conn.destroy(() => {})
      resolve({ ok: true })
    })
  })
}

export async function fetchTableColumns(
  creds: SnowflakeCreds,
  table: string
): Promise<{ ok: boolean; columns?: string[]; error?: string }> {
  return new Promise((resolve) => {
    const conn = makeConnection(creds)
    conn.connect((err) => {
      if (err) {
        resolve({ ok: false, error: err.message })
        return
      }
      const fullTable = `${creds.database}.${creds.schema}.${table}`
      conn.execute({
        sqlText: `SELECT * FROM ${fullTable} LIMIT 1`,
        complete: (execErr, _stmt, rows) => {
          conn.destroy(() => {})
          if (execErr) {
            resolve({ ok: false, error: execErr.message })
            return
          }
          const columns = rows && rows.length > 0
            ? Object.keys(rows[0] as Record<string, unknown>)
            : []
          resolve({ ok: true, columns })
        },
      })
    })
  })
}

export async function sampleSnowflakeTable(
  creds: SnowflakeCreds,
  mapping: SnowflakeMapping
): Promise<{ ok: boolean; rows?: Record<string, unknown>[]; error?: string }> {
  return new Promise((resolve) => {
    const conn = makeConnection(creds)
    conn.connect((err) => {
      if (err) {
        resolve({ ok: false, error: err.message })
        return
      }

      const fullTable = `${creds.database}.${creds.schema}.${mapping.table}`
      const sql = `SELECT * FROM ${fullTable} LIMIT 5`

      conn.execute({
        sqlText: sql,
        complete: (execErr, _stmt, rows) => {
          conn.destroy(() => {})
          if (execErr) {
            resolve({ ok: false, error: execErr.message })
            return
          }
          resolve({ ok: true, rows: (rows ?? []) as Record<string, unknown>[] })
        },
      })
    })
  })
}

export async function countSnowflakeRows(
  creds: SnowflakeCreds,
  mapping: SnowflakeMapping,
  since?: string
): Promise<{ ok: boolean; count?: number; error?: string }> {
  return new Promise((resolve) => {
    const conn = makeConnection(creds)
    conn.connect((err) => {
      if (err) { resolve({ ok: false, error: err.message }); return }
      const fullTable = `${creds.database}.${creds.schema}.${mapping.table}`
      const where = since ? `WHERE ${mapping.colDate} >= '${since}'` : ''
      conn.execute({
        sqlText: `SELECT COUNT(*) AS N FROM ${fullTable} ${where}`,
        complete: (execErr, _stmt, rows) => {
          conn.destroy(() => {})
          if (execErr) { resolve({ ok: false, error: execErr.message }); return }
          const row = (rows ?? [])[0] as Record<string, unknown> | undefined
          const n = row ? Number(row['N'] ?? row['n'] ?? row['COUNT(*)'] ?? 0) : 0
          resolve({ ok: true, count: n })
        },
      })
    })
  })
}

export async function fetchSnowflakeRows(
  creds: SnowflakeCreds,
  mapping: SnowflakeMapping,
): Promise<{ ok: boolean; rows?: Record<string, unknown>[]; error?: string }> {
  return new Promise((resolve) => {
    const conn = makeConnection(creds)
    conn.connect((err) => {
      if (err) {
        resolve({ ok: false, error: err.message })
        return
      }

      const fullTable = `${creds.database}.${creds.schema}.${mapping.table}`
      const sql = `SELECT * FROM ${fullTable}`

      // Always stream — avoids rows=undefined issue with large result sets
      conn.execute({
        sqlText: sql,
        streamResult: true,
        complete: (execErr, stmt) => {
          if (execErr) {
            conn.destroy(() => {})
            resolve({ ok: false, error: execErr.message })
            return
          }
          const allRows: Record<string, unknown>[] = []
          stmt.streamRows()
            .on('data', (row: Record<string, unknown>) => allRows.push(row))
            .on('end', () => { conn.destroy(() => {}); resolve({ ok: true, rows: allRows }) })
            .on('error', (streamErr: Error) => { conn.destroy(() => {}); resolve({ ok: false, error: streamErr.message }) })
        },
      })
    })
  })
}

export function mapRow(
  row: Record<string, unknown>,
  mapping: SnowflakeMapping
) {
  function val(col?: string) {
    if (!col) return undefined
    // Snowflake returns uppercase column names by default
    return row[col] ?? row[col.toUpperCase()] ?? row[col.toLowerCase()]
  }

  return {
    brand:            String(val(mapping.colBrand) ?? ''),
    date:             toISODate(val(mapping.colDate) ?? ''),
    headline:         val(mapping.colHeadline) != null ? String(val(mapping.colHeadline)) : null,
    spend:            val(mapping.colSpend) != null ? Number(val(mapping.colSpend)) : null,
    impressions:      val(mapping.colImpressions) != null ? Number(val(mapping.colImpressions)) : null,
    reach:            val(mapping.colReach) != null ? Number(val(mapping.colReach)) : null,
    performanceIndex: val(mapping.colPi) != null ? Number(val(mapping.colPi)) : null,
    funnelStage:      val(mapping.colFunnel) != null ? String(val(mapping.colFunnel)) : null,
    topic:            val(mapping.colTopic) != null ? String(val(mapping.colTopic)) : null,
  }
}

// Snowflake DATE columns come back as JS Date objects — normalise to YYYY-MM-DD
function toISODate(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  const s = String(val)
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // JS Date string like "Mon Mar 02 2026 01:00:00 GMT+0100 ..."
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return s
}
