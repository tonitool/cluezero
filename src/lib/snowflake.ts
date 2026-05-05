/**
 * Snowflake service via Composio — SERVER ONLY
 *
 * Do NOT import this file in 'use client' components.
 */

import 'server-only'

export const SF_VERSION = '20260407_00'

export type SnowflakeMapping = {
  database: string
  schema: string
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
