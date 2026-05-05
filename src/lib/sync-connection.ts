import { createClient as createAdminClient } from '@supabase/supabase-js'
import { executeAction } from '@/lib/composio'
import { mapRow, detectDateColumn, type SnowflakeMapping } from '@/lib/snowflake'
import { detectAlerts } from '@/lib/detect-alerts'

const BATCH_SIZE = 500
const QUERY_CHUNK_SIZE = 100
const MAX_RETRIES = 3

interface MappedRow {
  brand: string
  date: string
  headline: string | null
  spend: number | null
  impressions: number | null
  reach: number | null
  performanceIndex: number | null
  funnelStage: string | null
  topic: string | null
  thumbnailUrl: string | null
  globalAdId: string | null
  platform: string | null
  isActive: boolean | null
  format: string | null
}

interface AdRow {
  workspace_id: string
  brand_id: string
  platform: string
  ad_id: string
  headline: string | null
  performance_index: number | null
  topic: string | null
  thumbnail_url: string | null
  first_seen_at: string
  last_seen_at: string
  is_active: boolean
  connection_id: string
  global_ad_id?: string
  source_platform?: string
  format_type?: string
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  d.setUTCDate(diff)
  return d.toISOString().slice(0, 10)
}

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function executeSnowflakeQuery(
  workspaceId: string,
  sql: string,
  mapping: SnowflakeMapping,
  retries = MAX_RETRIES,
): Promise<Record<string, unknown>[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await executeAction(workspaceId, 'SNOWFLAKE_BASIC_RUN_QUERY', {
        query: sql,
        database: mapping.database,
        schema_name: mapping.schema,
      }) as { data?: unknown; response?: string; error?: string }

      if (result?.error) throw new Error(result.error)
      return parseResultRows(result)
    } catch (err) {
      if (attempt === retries) throw err
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[sync] Query attempt ${attempt} failed: ${msg}, retrying...`)
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  return []
}

function parseResultRows(result: { data?: unknown; response?: string }): Record<string, unknown>[] {
  const raw = result?.data ?? result?.response
  if (!raw) return []
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
  try {
    const parsed = JSON.parse(str)
    if (Array.isArray(parsed)) return parsed
    if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows
    if (parsed?.data && Array.isArray(parsed.data)) return parsed.data
  } catch { /* not JSON */ }
  return []
}

async function fetchRowsChunked(
  workspaceId: string,
  mapping: SnowflakeMapping,
  since?: string,
  onProgress?: (fetched: number) => void,
): Promise<Record<string, unknown>[]> {
  const fqTable = `"${mapping.database}"."${mapping.schema}"."${mapping.table}"`

  // Sample one row to detect the date column name for incremental filtering
  let whereClause = ''
  if (since) {
    const sample = await executeSnowflakeQuery(
      workspaceId,
      `SELECT * FROM ${fqTable} LIMIT 1`,
      mapping,
    )
    const dateCol = sample[0] ? detectDateColumn(sample[0]) : null
    if (dateCol) {
      whereClause = `WHERE "${dateCol}" >= '${since}'`
    }
  }

  const countSql = `SELECT COUNT(*) as total FROM ${fqTable} ${whereClause}`
  const countRows = await executeSnowflakeQuery(workspaceId, countSql, mapping)
  const totalCount = Number(countRows[0]?.TOTAL ?? countRows[0]?.total ?? 0)
  console.log(`[sync] Total rows to fetch: ${totalCount}`)

  const allRows: Record<string, unknown>[] = []
  for (let offset = 0; offset < totalCount; offset += QUERY_CHUNK_SIZE) {
    const sql = `SELECT * FROM ${fqTable} ${whereClause} LIMIT ${QUERY_CHUNK_SIZE} OFFSET ${offset}`
    const rows = await executeSnowflakeQuery(workspaceId, sql, mapping)
    allRows.push(...rows)
    onProgress?.(allRows.length)
    console.log(`[sync] Fetched ${allRows.length} / ${totalCount} rows`)
  }

  return allRows
}

export async function syncConnection(
  connectionId: string,
  workspaceId: string,
): Promise<{ ok: boolean; fetched: number; inserted: number; errors: string[] }> {
  const db = supabaseAdmin()
  const errors: string[] = []

  const { data: conn, error: connErr } = await db
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (connErr || !conn) {
    return { ok: false, fetched: 0, inserted: 0, errors: ['Connection not found'] }
  }

  if (conn.app_name !== 'snowflake') {
    return { ok: false, fetched: 0, inserted: 0, errors: ['Not a Snowflake connection'] }
  }

  await setStatus(db, connectionId, 'syncing')

  const cfg = (conn.config ?? {}) as Record<string, string>
  const mapping: SnowflakeMapping = {
    database:  cfg.database ?? '',
    schema:    cfg.schemaName ?? 'PUBLIC',
    table:     cfg.tableName ?? '',
    warehouse: cfg.warehouse || undefined,
  }

  if (!mapping.database || !mapping.table) {
    await setStatus(db, connectionId, 'error', 'Missing database or table name')
    return { ok: false, fetched: 0, inserted: 0, errors: ['Missing database or table name'] }
  }

  const lastSynced = conn.last_sync_at ? new Date(conn.last_sync_at).toISOString().slice(0, 10) : undefined
  console.log(`[sync] Incremental sync from: ${lastSynced ?? 'beginning'}`)

  let rawRows: Record<string, unknown>[]
  try {
    rawRows = await fetchRowsChunked(workspaceId, mapping, lastSynced, (fetched) => {
      db.from('connections').update({ sync_progress: fetched }).eq('id', connectionId).then(() => {})
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await setStatus(db, connectionId, 'error', `Fetch failed: ${msg}`)
    return { ok: false, fetched: 0, inserted: 0, errors: [`Fetch failed: ${msg}`] }
  }

  console.log(`[sync] Fetched ${rawRows.length} rows from Snowflake`)

  if (rawRows.length === 0) {
    await db.from('connections').update({
      sync_status: 'idle',
      sync_error: null,
      sync_progress: null,
      sync_total: null,
      last_sync_at: new Date().toISOString(),
      last_sync_rows: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', connectionId)
    return { ok: true, fetched: 0, inserted: 0, errors: [] }
  }

  const mapped: MappedRow[] = rawRows.map(raw => mapRow(raw))

  // Validate that we can at least detect brand and date
  const sample = mapped[0]
  if (!sample.brand || !sample.date) {
    const cols = Object.keys(rawRows[0]).join(', ')
    const msg = `Could not detect brand or date column. Available columns: ${cols}`
    await setStatus(db, connectionId, 'error', msg)
    return { ok: false, fetched: 0, inserted: 0, errors: [msg] }
  }

  await db.from('connections').update({ sync_total: mapped.length, sync_progress: 0 }).eq('id', connectionId)

  const brandCache = new Map<string, string>()
  const { data: existingBrands } = await db
    .from('tracked_brands')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'snowflake')

  for (const b of existingBrands ?? []) {
    brandCache.set(b.name.toLowerCase().trim(), b.id)
  }

  const newBrandNames = new Map<string, string>()
  for (const r of mapped) {
    if (!r.brand) continue
    const key = r.brand.toLowerCase().trim()
    if (!brandCache.has(key) && !newBrandNames.has(key)) {
      newBrandNames.set(key, r.brand)
    }
  }

  if (newBrandNames.size > 0) {
    const brandRows = [...newBrandNames.values()].map(name => ({
      workspace_id: workspaceId,
      name,
      platform: 'snowflake' as const,
      is_own_brand: false,
    }))
    const { error: brandInsertErr } = await db.from('tracked_brands').insert(brandRows)
    if (brandInsertErr && !brandInsertErr.message.includes('duplicate')) {
      errors.push(`Brand insert: ${brandInsertErr.message}`)
    }
    const { data: allBrands } = await db
      .from('tracked_brands')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'snowflake')
    brandCache.clear()
    for (const b of allBrands ?? []) {
      brandCache.set(b.name.toLowerCase().trim(), b.id)
    }
  }

  console.log(`[sync] Brand cache: ${brandCache.size} brands`)

  const connPrefix = connectionId.slice(0, 8)
  let totalInserted = 0
  let processed = 0
  const validStages = new Set(['see', 'think', 'do', 'care'])

  const { data: allExistingAds } = await db
    .from('ads')
    .select('id, ad_id')
    .eq('workspace_id', workspaceId)

  const adIdToUuid = new Map<string, string>()
  for (const row of allExistingAds ?? []) {
    adIdToUuid.set(row.ad_id, row.id)
  }

  console.log(`[sync] Pre-loaded ${adIdToUuid.size} existing ads`)

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const chunk = mapped.slice(i, i + BATCH_SIZE)

    const adRowByAdId = new Map<string, AdRow>()
    const spendEntries: { adId: string; row: MappedRow }[] = []
    const enrichmentByAdId = new Map<string, MappedRow>()

    for (const r of chunk) {
      if (!r.brand || !r.date) continue
      const brandId = brandCache.get(r.brand.toLowerCase().trim())
      if (!brandId) continue

      const globalAdId = r.globalAdId?.trim() || null
      const brand = r.brand.trim()
      const headline = r.headline?.trim() || null

      const adId = globalAdId
        ? `${connPrefix}_${globalAdId}`
        : `${connPrefix}_sf_${brand}_${headline ?? 'unknown'}_${r.date}`
            .replace(/\s+/g, '_')
            .toLowerCase()

      const platform = r.platform?.trim().toLowerCase() || 'snowflake'

      const adRow: AdRow = {
        workspace_id: workspaceId,
        brand_id: brandId,
        platform,
        ad_id: adId,
        headline,
        performance_index: r.performanceIndex,
        topic: r.topic?.trim() || null,
        thumbnail_url: r.thumbnailUrl?.trim() || null,
        first_seen_at: r.date,
        last_seen_at: r.date,
        is_active: r.isActive ?? true,
        connection_id: connectionId,
      }
      if (globalAdId) adRow.global_ad_id = globalAdId
      if (r.platform?.trim()) adRow.source_platform = r.platform.trim()
      if (r.format?.trim()) adRow.format_type = r.format.trim()

      adRowByAdId.set(adId, adRow)
      spendEntries.push({ adId, row: r })
      enrichmentByAdId.set(adId, r)
    }

    const adRows = [...adRowByAdId.values()]
    if (adRows.length === 0) { processed += chunk.length; continue }

    const newAdRows = adRows.filter(r => !adIdToUuid.has(r.ad_id))
    if (newAdRows.length > 0) {
      const { data: inserted } = await db.from('ads').insert(newAdRows).select('id, ad_id')
      if (inserted) {
        totalInserted += inserted.length
        for (const row of inserted) adIdToUuid.set(row.ad_id, row.id)
      }
    }

    const spendRecords: Record<string, unknown>[] = []
    for (const { adId, row: r } of spendEntries) {
      const uuid = adIdToUuid.get(adId)
      if (!uuid) continue
      if (r.spend == null && r.impressions == null && r.reach == null) continue
      spendRecords.push({
        ad_id: uuid,
        week_start: weekStart(r.date),
        est_spend_eur: r.spend,
        est_impressions: r.impressions,
        est_reach: r.reach,
        is_new_ad: newAdRows.some(n => n.ad_id === adId),
      })
    }

    if (spendRecords.length > 0) {
      const { error: spendErr } = await db
        .from('ad_spend_estimates')
        .upsert(spendRecords, { onConflict: 'ad_id,week_start' })
      if (spendErr) errors.push(`Spend upsert: ${spendErr.message}`)
    }

    const enrichments: Record<string, unknown>[] = []
    for (const [adId, r] of enrichmentByAdId) {
      const uuid = adIdToUuid.get(adId)
      if (!uuid) continue
      const enr: Record<string, unknown> = { ad_id: uuid }
      if (r.funnelStage) {
        const norm = r.funnelStage.toLowerCase()
        if (validStages.has(norm)) enr.funnel_stage = norm.charAt(0).toUpperCase() + norm.slice(1)
      }
      if (r.topic) enr.topic = r.topic.trim()
      if (enr.funnel_stage || enr.topic) enrichments.push(enr)
    }

    if (enrichments.length > 0) {
      const { error: enrichErr } = await db
        .from('ad_enrichments')
        .upsert(enrichments, { onConflict: 'ad_id' })
      if (enrichErr) errors.push(`Enrichment upsert: ${enrichErr.message}`)
    }

    processed += chunk.length
  }

  console.log(`[sync] Complete: ${totalInserted} new ads, ${processed} rows processed, ${errors.length} errors`)

  await db.from('connections').update({
    sync_status: 'idle',
    sync_error: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
    sync_progress: null,
    sync_total: null,
    last_sync_at: new Date().toISOString(),
    last_sync_rows: processed,
    updated_at: new Date().toISOString(),
  }).eq('id', connectionId)

  detectAlerts(workspaceId).catch(err =>
    console.error('[sync] detectAlerts failed:', err),
  )

  return { ok: true, fetched: rawRows.length, inserted: totalInserted, errors }
}

async function setStatus(
  db: ReturnType<typeof supabaseAdmin>,
  connectionId: string,
  status: 'syncing' | 'error',
  error?: string,
) {
  await db.from('connections').update({
    sync_status: status,
    sync_error: error ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', connectionId)
}
