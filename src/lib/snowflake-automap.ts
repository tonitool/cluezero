import 'server-only'
import { executeAction } from '@/lib/composio'

/**
 * Call DESCRIBE TABLE and auto-map columns to our data model by name matching.
 * Returns null if DESCRIBE TABLE fails or required columns can't be found.
 */
export async function autoMapSnowflakeColumns(
  workspaceId: string,
  database: string,
  schema: string,
  table: string,
): Promise<Record<string, string> | null> {
  let columnNames: string[]
  try {
    const result = await executeAction(workspaceId, 'SNOWFLAKE_BASIC_DESCRIBE_TABLE', {
      database,
      schema_name: schema,
      table_name: table,
    }) as { data?: unknown }

    const raw = result?.data
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '')
    let rows: Record<string, unknown>[] = []
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) rows = parsed
      else if (Array.isArray(parsed?.data)) rows = parsed.data
      else if (Array.isArray(parsed?.rows)) rows = parsed.rows
    } catch { /* not JSON */ }

    // DESCRIBE TABLE returns rows with a "name" or "column_name" field
    columnNames = rows
      .map(r => String(r.name ?? r.column_name ?? r.NAME ?? r.COLUMN_NAME ?? ''))
      .filter(Boolean)
  } catch {
    return null
  }

  if (columnNames.length === 0) return null

  function pick(...patterns: string[]): string | undefined {
    for (const p of patterns) {
      const exact = columnNames.find(c => c.toLowerCase() === p.toLowerCase())
      if (exact) return exact
    }
    for (const p of patterns) {
      const partial = columnNames.find(c => c.toLowerCase().includes(p.toLowerCase()))
      if (partial) return partial
    }
    return undefined
  }

  const colBrand = pick('brand', 'advertiser', 'advertiser_name', 'brand_name', 'company')
  const colDate  = pick('date', 'week_start', 'week_date', 'report_date', 'ad_date', 'week', 'period')

  if (!colBrand || !colDate) return null

  const mapping: Record<string, string> = { colBrand, colDate }

  const colAdId        = pick('ad_id', 'global_ad_id', 'ad_key', 'adid')
  const colHeadline    = pick('headline', 'ad_text', 'creative_text', 'copy', 'message', 'body')
  const colSpend       = pick('spend', 'est_spend', 'spend_eur', 'cost', 'amount')
  const colImpressions = pick('impressions', 'est_impressions', 'imp', 'views')
  const colReach       = pick('reach', 'est_reach', 'unique_reach')
  const colPi          = pick('performance_index', 'pi', 'pi_score', 'score', 'index')
  const colFunnel      = pick('funnel', 'funnel_stage', 'stage', 'funnel_level')
  const colTopic       = pick('topic', 'category', 'theme')
  const colPlatform    = pick('platform', 'channel', 'network', 'source_platform')
  const colThumbnail   = pick('thumbnail', 'thumbnail_url', 'image_url', 'creative_url')
  const colIsActive    = pick('is_active', 'active', 'status', 'is_running')
  const colFormat      = pick('format', 'ad_format', 'format_type', 'creative_type')

  if (colAdId)        mapping.colAdId        = colAdId
  if (colHeadline)    mapping.colHeadline    = colHeadline
  if (colSpend)       mapping.colSpend       = colSpend
  if (colImpressions) mapping.colImpressions = colImpressions
  if (colReach)       mapping.colReach       = colReach
  if (colPi)          mapping.colPi          = colPi
  if (colFunnel)      mapping.colFunnel      = colFunnel
  if (colTopic)       mapping.colTopic       = colTopic
  if (colPlatform)    mapping.colPlatform    = colPlatform
  if (colThumbnail)   mapping.colThumbnail   = colThumbnail
  if (colIsActive)    mapping.colIsActive    = colIsActive
  if (colFormat)      mapping.colFormat      = colFormat

  return mapping
}
