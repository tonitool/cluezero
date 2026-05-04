/**
 * Snowflake service via Composio — SERVER ONLY
 *
 * Replaces the direct snowflake-sdk with Composio actions.
 * All queries go through Composio's connected Snowflake account.
 *
 * Do NOT import this file in 'use client' components.
 */

import 'server-only'
import { executeAction } from '@/lib/composio'

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
  colThumbnail?: string
  colAdId?: string
  colPlatform?: string
  colIsActive?: string
  colFormat?: string
}

/**
 * Test Snowflake connection via Composio.
 * Runs a simple SELECT 1 to verify the connection works.
 */
export async function testSnowflakeConnectionComposio(
  workspaceId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await executeAction(workspaceId, 'SNOWFLAKE_EXECUTE_SQL', {
      statement: 'SELECT 1',
    }) as { response?: string; error?: string }

    if (result?.error) {
      return { ok: false, error: result.error }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection test failed' }
  }
}

/**
 * Fetch columns from a table via Composio.
 * Uses INFORMATION_SCHEMA to get column names without pulling data.
 */
export async function fetchTableColumnsComposio(
  workspaceId: string,
  database: string,
  schema: string,
  table: string,
): Promise<{ ok: boolean; columns?: string[]; error?: string }> {
  try {
    const result = await executeAction(workspaceId, 'SNOWFLAKE_EXECUTE_SQL', {
      statement: `SELECT COLUMN_NAME FROM ${database}.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND TABLE_SCHEMA = '${schema}' ORDER BY ORDINAL_POSITION`,
    }) as { response?: string; error?: string }

    if (result?.error) {
      return { ok: false, error: result.error }
    }

    // Composio returns rows as JSON array in response
    const rows = parseResultRows(result)
    const columns = rows.map((r: Record<string, unknown>) =>
      String(r.COLUMN_NAME ?? r.column_name ?? '')
    ).filter(Boolean)

    return { ok: true, columns }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to fetch columns' }
  }
}

/**
 * Sample rows from a table via Composio.
 */
export async function sampleTableComposio(
  workspaceId: string,
  mapping: SnowflakeMapping,
): Promise<{ ok: boolean; rows?: Record<string, unknown>[]; error?: string }> {
  try {
    const result = await executeAction(workspaceId, 'SNOWFLAKE_EXECUTE_SQL', {
      statement: `SELECT * FROM ${mapping.table} LIMIT 5`,
    }) as { response?: string; error?: string }

    if (result?.error) {
      return { ok: false, error: result.error }
    }

    const rows = parseResultRows(result)
    return { ok: true, rows }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to sample table' }
  }
}

/**
 * Fetch mapped rows from Snowflake via Composio.
 * Builds a SELECT with only the columns needed for the sync engine.
 */
export async function fetchSnowflakeRowsComposio(
  workspaceId: string,
  mapping: SnowflakeMapping,
  since?: string,
): Promise<{ ok: boolean; rows?: Record<string, unknown>[]; error?: string }> {
  try {
    const cols = new Set<string>()
    cols.add(mapping.colBrand)
    cols.add(mapping.colDate)
    if (mapping.colHeadline) cols.add(mapping.colHeadline)
    if (mapping.colSpend) cols.add(mapping.colSpend)
    if (mapping.colImpressions) cols.add(mapping.colImpressions)
    if (mapping.colReach) cols.add(mapping.colReach)
    if (mapping.colPi) cols.add(mapping.colPi)
    if (mapping.colFunnel) cols.add(mapping.colFunnel)
    if (mapping.colTopic) cols.add(mapping.colTopic)
    if (mapping.colThumbnail) cols.add(mapping.colThumbnail)
    if (mapping.colAdId) cols.add(mapping.colAdId)
    if (mapping.colPlatform) cols.add(mapping.colPlatform)
    if (mapping.colIsActive) cols.add(mapping.colIsActive)
    if (mapping.colFormat) cols.add(mapping.colFormat)

    const colList = [...cols].map(c => `"${c}"`).join(', ')
    const whereClause = since ? `WHERE "${mapping.colDate}" >= '${since}'` : ''
    const sql = `SELECT ${colList} FROM ${mapping.table} ${whereClause}`

    const result = await executeAction(workspaceId, 'SNOWFLAKE_EXECUTE_SQL', {
      statement: sql,
    }) as { response?: string; error?: string }

    if (result?.error) {
      return { ok: false, error: result.error }
    }

    const rows = parseResultRows(result)
    return { ok: true, rows }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to fetch rows' }
  }
}

/**
 * Parse Composio SQL result into row objects.
 * Composio returns results as a JSON string or array.
 */
function parseResultRows(result: { response?: string }): Record<string, unknown>[] {
  if (!result?.response) return []

  // Try parsing as JSON array
  try {
    const parsed = JSON.parse(result.response)
    if (Array.isArray(parsed)) return parsed
    if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows
  } catch { /* not JSON, return empty */ }

  return []
}

/**
 * Map a raw Snowflake row to the normalized app schema.
 * (Same logic as the old mapRow — kept identical for data consistency.)
 */
export function mapRow(
  row: Record<string, unknown>,
  mapping: SnowflakeMapping,
) {
  function val(col?: string) {
    if (!col) return undefined
    return row[col] ?? row[col.toUpperCase()] ?? row[col.toLowerCase()]
  }

  const rawPlatform = val(mapping.colPlatform)
  const platform = rawPlatform != null ? String(rawPlatform).toLowerCase() : null

  const rawActive = val(mapping.colIsActive)
  let isActive: boolean | null = null
  if (rawActive != null) {
    if (typeof rawActive === 'boolean') isActive = rawActive
    else {
      const s = String(rawActive).toLowerCase()
      isActive = s === 'true' || s === '1' || s === 'yes'
    }
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
    thumbnailUrl:     val(mapping.colThumbnail) != null ? String(val(mapping.colThumbnail)) : null,
    globalAdId:       val(mapping.colAdId) != null ? String(val(mapping.colAdId)) : null,
    platform,
    isActive,
    format:           val(mapping.colFormat) != null ? String(val(mapping.colFormat)).toLowerCase() : null,
  }
}

function toISODate(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  const s = String(val)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return s
}
