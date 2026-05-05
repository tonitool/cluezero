/**
 * sync-connection.ts — Composio Snowflake → Supabase sync engine (streamlined)
 *
 * Improvements:
 * - Chunked SQL queries with LIMIT/OFFSET to avoid Composio timeouts
 * - Incremental sync (only fetch rows since last sync)
 * - Larger Supabase batch sizes (500 rows)
 * - Retry logic for transient failures
 * - Progress tracking only at start/end (not every chunk)
 * - is_new_ad flag on spend records for new vs existing spend split
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { executeAction } from '@/lib/composio'
import { mapRow, type SnowflakeMapping } from '@/lib/snowflake'

const SF_VERSION = '20260407_00'
import { detectAlerts } from '@/lib/detect-alerts'

// Batch size for Supabase inserts (PostgREST handles up to ~1000 well)
const BATCH_SIZE = 500

// Chunk size for Composio SQL queries (avoids response size limits)
const QUERY_CHUNK_SIZE = 2000

// Max retries for transient failures
const MAX_RETRIES = 3

// ─── Types ────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

/**
 * Execute a Snowflake SQL query via Composio with retry logic.
 */
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
      }, SF_VERSION) as { data?: unknown; response?: string; error?: string }

      if (result?.error) throw new Error(result.error)

      return parseResultRows(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (attempt === retries) throw err
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

/**
 * Fetch rows from Snowflake in chunks using LIMIT/OFFSET.
 * This avoids Composio response size limits on large tables.
 */
async function fetchRowsChunked(
  workspaceId: string,
  mapping: SnowflakeMapping,
  since?: string,
  onProgress?: (fetched: number) => void,
): Promise<Record<string, unknown>[]> {
  // Build SELECT with only mapped columns
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
  const baseSql = `SELECT ${colList} FROM ${mapping.table} ${whereClause}`

  // First, get the total count
  const countSql = `SELECT COUNT(*) as total FROM ${mapping.table} ${whereClause}`
  const countRows = await executeSnowflakeQuery(workspaceId, countSql, mapping)
  const totalCount = Number(countRows[0]?.TOTAL ?? countRows[0]?.total ?? 0)

  console.log(`[sync] Total rows to fetch: ${totalCount}`)

  const allRows: Record<string, unknown>[] = []

  for (let offset = 0; offset < totalCount; offset += QUERY_CHUNK_SIZE) {
    const chunkSql = `${baseSql} LIMIT ${QUERY_CHUNK_SIZE} OFFSET ${offset}`
    const rows = await executeSnowflakeQuery(workspaceId, chunkSql, mapping)
    allRows.push(...rows)
    onProgress?.(allRows.length)
    console.log(`[sync] Fetched ${allRows.length} / ${totalCount} rows`)
  }

  return allRows
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function syncConnection(
  connectionId: string,
  workspaceId: string,
): Promise<{ ok: boolean; fetched: number; inserted: number; errors: string[] }> {
  const db = supabaseAdmin()
  const errors: string[] = []

  // ── 1. Load connection config ──────────────────────────────────────────

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
    database: cfg.database ?? '',
    schema: cfg.schemaName ?? 'PUBLIC',
    table: cfg.tableName ?? '',
    colBrand: cfg.colBrand ?? '',
    colDate: cfg.colDate ?? '',
    colHeadline: cfg.colHeadline ?? undefined,
    colSpend: cfg.colSpend ?? undefined,
    colImpressions: cfg.colImpressions ?? undefined,
    colReach: cfg.colReach ?? undefined,
    colPi: cfg.colPi ?? undefined,
    colFunnel: cfg.colFunnel ?? undefined,
    colTopic: cfg.colTopic ?? undefined,
    colThumbnail: cfg.colThumbnail ?? undefined,
    colAdId: cfg.colAdId ?? undefined,
    colPlatform: cfg.colPlatform ?? undefined,
    colIsActive: cfg.colIsActive ?? undefined,
    colFormat: cfg.colFormat ?? undefined,
  }

  if (!mapping.database || !mapping.table || !mapping.colBrand || !mapping.colDate) {
    await setStatus(db, connectionId, 'error', 'Missing database, table, or required column mapping')
    return { ok: false, fetched: 0, inserted: 0, errors: ['Missing database, table, or required column mapping'] }
  }

  // ── 2. Incremental sync: only fetch rows since last sync ───────────────

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

  // ── 3. Map all rows ────────────────────────────────────────────────────

  const mapped: MappedRow[] = rawRows.map(raw => mapRow(raw, mapping))

  await db.from('connections').update({ sync_total: mapped.length, sync_progress: 0 }).eq('id', connectionId)

  // ── 4. Ensure all brands exist ─────────────────────────────────────────

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

  // ── 5. Batch insert ads, spend, enrichments ────────────────────────────

  const connPrefix = connectionId.slice(0, 8)
  let totalInserted = 0
  let processed = 0
  const validStages = new Set(['see', 'think', 'do', 'care'])

  // Pre-load ALL existing ad IDs for this workspace to avoid per-chunk SELECTs
  const { data: allExistingAds } = await db
    .from('ads')
    .select('id, ad_id')
    .eq('workspace_id', workspaceId)

  const adIdToUuid = new Map<string, string>()
  for (const row of allExistingAds ?? []) {
    adIdToUuid.set(row.ad_id, row.id)
  }

  console.log(`[sync] Pre-loaded ${adIdToUuid.size} existing ads`)

  // Process in batches
  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const chunk = mapped.slice(i, i + BATCH_SIZE)

    // Build ad rows (deduplicated), spend entries, and enrichments
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
    if (adRows.length === 0) {
      processed += chunk.length
      continue
    }

    // Filter to only new ads
    const newAdRows = adRows.filter(r => !adIdToUuid.has(r.ad_id))

    if (newAdRows.length > 0) {
      const { data: inserted } = await db
        .from('ads')
        .insert(newAdRows)
        .select('id, ad_id')

      if (inserted) {
        totalInserted += inserted.length
        for (const row of inserted) {
          adIdToUuid.set(row.ad_id, row.id)
        }
      }
    }

    // ── Build spend records with is_new_ad flag ──────────────────────────

    const spendRecords: Record<string, unknown>[] = []
    for (const { adId, row: r } of spendEntries) {
      const uuid = adIdToUuid.get(adId)
      if (!uuid) continue
      if (r.spend == null && r.impressions == null && r.reach == null) continue

      const week = weekStart(r.date)
      const isNewAd = !adIdToUuid.has(adId) || newAdRows.some(n => n.ad_id === adId)
      spendRecords.push({
        ad_id: uuid,
        week_start: week,
        est_spend_eur: r.spend,
        est_impressions: r.impressions,
        est_reach: r.reach,
        is_new_ad: isNewAd,
      })
    }

    if (spendRecords.length > 0) {
      const { error: spendErr } = await db
        .from('ad_spend_estimates')
        .upsert(spendRecords, { onConflict: 'ad_id,week_start' })
      if (spendErr) {
        errors.push(`Spend upsert: ${spendErr.message}`)
      }
    }

    // ── Build enrichment records ────────────────────────────────────────

    const enrichments: Record<string, unknown>[] = []
    for (const [adId, r] of enrichmentByAdId) {
      const uuid = adIdToUuid.get(adId)
      if (!uuid) continue
      const enr: Record<string, unknown> = { ad_id: uuid }
      if (r.funnelStage) {
        const norm = r.funnelStage.toLowerCase()
        if (validStages.has(norm)) {
          enr.funnel_stage = norm.charAt(0).toUpperCase() + norm.slice(1)
        }
      }
      if (r.topic) enr.topic = r.topic.trim()
      if (enr.funnel_stage || enr.topic) enrichments.push(enr)
    }

    if (enrichments.length > 0) {
      const { error: enrichErr } = await db
        .from('ad_enrichments')
        .upsert(enrichments, { onConflict: 'ad_id' })
      if (enrichErr) {
        errors.push(`Enrichment upsert: ${enrichErr.message}`)
      }
    }

    processed += chunk.length
  }

  // ── 6. Done ────────────────────────────────────────────────────────────

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
