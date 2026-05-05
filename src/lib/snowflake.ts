/**
 * Snowflake service — SERVER ONLY
 */

import 'server-only'

export type SnowflakeMapping = {
  database: string
  schema: string
  table: string
  warehouse?: string
}

/**
 * Map a raw Snowflake row to our data model.
 * Detects column names from the row keys using common naming patterns.
 */
export function mapRow(row: Record<string, unknown>) {
  const keys = Object.keys(row)

  function find(...patterns: string[]): unknown {
    // Exact match first
    for (const p of patterns) {
      const k = keys.find(k => k.toLowerCase() === p.toLowerCase())
      if (k !== undefined) return row[k]
    }
    // Partial match fallback
    for (const p of patterns) {
      const k = keys.find(k => k.toLowerCase().includes(p.toLowerCase()))
      if (k !== undefined) return row[k]
    }
    return undefined
  }

  const rawPlatform = find('platform', 'channel', 'network', 'source_platform')
  const platform = rawPlatform != null ? String(rawPlatform).toLowerCase() : null

  const rawActive = find('is_active', 'active', 'is_running', 'status')
  let isActive: boolean | null = null
  if (rawActive != null) {
    if (typeof rawActive === 'boolean') isActive = rawActive
    else {
      const s = String(rawActive).toLowerCase()
      isActive = s === 'true' || s === '1' || s === 'yes'
    }
  }

  return {
    brand:            String(find('brand', 'advertiser', 'advertiser_name', 'brand_name', 'company') ?? ''),
    date:             toISODate(find('date', 'week_start', 'week_date', 'report_date', 'ad_date', 'week', 'period') ?? ''),
    headline:         nullStr(find('headline', 'ad_text', 'creative_text', 'copy', 'message', 'body')),
    spend:            nullNum(find('spend', 'est_spend', 'spend_eur', 'cost', 'amount')),
    impressions:      nullNum(find('impressions', 'est_impressions', 'imp', 'views')),
    reach:            nullNum(find('reach', 'est_reach', 'unique_reach')),
    performanceIndex: nullNum(find('performance_index', 'pi', 'pi_score', 'score')),
    funnelStage:      nullStr(find('funnel_stage', 'funnel', 'stage', 'funnel_level')),
    topic:            nullStr(find('topic', 'category', 'theme')),
    thumbnailUrl:     nullStr(find('thumbnail_url', 'thumbnail', 'image_url', 'creative_url')),
    globalAdId:       nullStr(find('global_ad_id', 'ad_id', 'ad_key', 'adid')),
    platform,
    isActive,
    format:           nullStr(find('format', 'ad_format', 'format_type', 'creative_type')),
  }
}

/** Return the date column name from a sample row (used for incremental WHERE clause). */
export function detectDateColumn(row: Record<string, unknown>): string | null {
  const patterns = ['date', 'week_start', 'week_date', 'report_date', 'ad_date', 'week', 'period']
  const keys = Object.keys(row)
  for (const p of patterns) {
    const k = keys.find(k => k.toLowerCase() === p.toLowerCase())
    if (k !== undefined) return k
  }
  for (const p of patterns) {
    const k = keys.find(k => k.toLowerCase().includes(p.toLowerCase()))
    if (k !== undefined) return k
  }
  return null
}

function nullStr(v: unknown): string | null {
  return v != null ? String(v) : null
}

function nullNum(v: unknown): number | null {
  return v != null ? Number(v) : null
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
