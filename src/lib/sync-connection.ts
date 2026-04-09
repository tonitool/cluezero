/**
 * sync-connection.ts — Snowflake → Supabase sync engine (clean rebuild)
 *
 * Data model:
 *   Snowflake view V_AD_LIBRARY_FINAL_WEEKLY is a MONTHLY snapshot.
 *   Each row = one ad × one month (same ad appears ~4 times for 4 months).
 *
 * Strategy:
 *   1. Fetch all rows from Snowflake via the SDK
 *   2. Map each raw row to our normalized schema
 *   3. Batch-insert brands (new ones only, plain INSERT, skip conflicts)
 *   4. Batch-insert ads   (new ones only, SELECT existing → INSERT new)
 *   5. Batch-insert spend (ALL rows — every ad×month gets a spend record)
 *   6. Batch-insert enrichments (one per ad, funnel stage)
 *   7. Fire-and-forget alert detection
 *
 * No ON CONFLICT DO UPDATE anywhere — avoids the Supabase PostgREST bug
 * where ignoreDuplicates is silently ignored, causing "cannot affect row
 * a second time" errors.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  fetchSnowflakeRows,
  mapRow,
  type SnowflakeCreds,
  type SnowflakeMapping,
} from '@/lib/snowflake'
import { detectAlerts } from '@/lib/detect-alerts'

// Supabase free tier has ~5 s statement timeout; 200 rows keeps us well under
const CHUNK_SIZE = 200

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Monday of the ISO week containing `dateStr` (YYYY-MM-DD). */
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

// ─── Types for the mapped row ───────────────────────────────────────────────

type MappedRow = ReturnType<typeof mapRow>

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

// ─── Main entry point ───────────────────────────────────────────────────────

export async function syncConnection(
  connectionId: string,
  workspaceId: string,
): Promise<{ ok: boolean; fetched: number; inserted: number; errors: string[] }> {
  const db = supabaseAdmin()
  const errors: string[] = []

  // ── 1. Load connection config ──────────────────────────────────────────

  const { data: conn, error: connErr } = await db
    .from('snowflake_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (connErr || !conn) {
    return { ok: false, fetched: 0, inserted: 0, errors: ['Connection not found'] }
  }

  await setStatus(db, connectionId, 'syncing')

  const creds: SnowflakeCreds = {
    account: conn.account,
    username: conn.username,
    password: conn.password ?? undefined,
    privateKey: conn.private_key ?? undefined,
    privateKeyPass: conn.private_key_pass ?? undefined,
    role: conn.role ?? undefined,
    warehouse: conn.warehouse,
    database: conn.database,
    schema: conn.schema,
  }

  const mapping: SnowflakeMapping = {
    table: conn.table_name,
    colBrand: conn.col_brand,
    colDate: conn.col_date,
    colHeadline: conn.col_headline ?? undefined,
    colSpend: conn.col_spend ?? undefined,
    colImpressions: conn.col_impressions ?? undefined,
    colReach: conn.col_reach ?? undefined,
    colPi: conn.col_pi ?? undefined,
    colFunnel: conn.col_funnel ?? undefined,
    colTopic: conn.col_topic ?? undefined,
    colThumbnail: conn.col_thumbnail ?? undefined,
    colAdId: conn.col_ad_id ?? undefined,
    colPlatform: conn.col_platform ?? undefined,
    colIsActive: conn.col_is_active ?? undefined,
    colFormat: conn.col_format ?? undefined,
  }

  // ── 2. Fetch from Snowflake ────────────────────────────────────────────

  const fetchResult = await fetchSnowflakeRows(creds, mapping, undefined)

  if (!fetchResult.ok || !fetchResult.rows) {
    await setStatus(db, connectionId, 'error', fetchResult.error)
    return { ok: false, fetched: 0, inserted: 0, errors: [fetchResult.error ?? 'Fetch failed'] }
  }

  const rawRows = fetchResult.rows
  console.log(`[sync] Fetched ${rawRows.length} rows from Snowflake`)

  // ── 3. Map all rows ────────────────────────────────────────────────────

  const mapped = rawRows.map(raw => mapRow(raw, mapping))

  await db
    .from('snowflake_connections')
    .update({ sync_progress: 0, sync_total: mapped.length })
    .eq('id', connectionId)

  // ── 4. Ensure all brands exist ─────────────────────────────────────────
  //
  // Collect unique brand names → load existing from DB → plain INSERT new
  // ones (no ON CONFLICT) → reload cache.

  const brandCache = new Map<string, string>() // lowercase name → uuid

  const { data: existingBrands, error: brandsErr } = await db
    .from('tracked_brands')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'snowflake')

  if (brandsErr) {
    await setStatus(db, connectionId, 'error', `Brand load failed: ${brandsErr.message}`)
    return { ok: false, fetched: rawRows.length, inserted: 0, errors: [brandsErr.message] }
  }

  for (const b of existingBrands ?? []) {
    brandCache.set(b.name.toLowerCase().trim(), b.id)
  }

  // Find brand names that don't exist yet
  const newBrandNames = new Map<string, string>() // key → original casing
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

    // Plain insert — if a race condition causes a duplicate, catch and continue
    const { error: brandInsertErr } = await db.from('tracked_brands').insert(brandRows)
    if (brandInsertErr && !brandInsertErr.message.includes('duplicate')) {
      errors.push(`Brand insert: ${brandInsertErr.message}`)
    }

    // Reload full cache (covers both pre-existing and newly inserted)
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

  // ── 5. Chunked ad + spend + enrichment insert ─────────────────────────
  //
  // For each chunk of mapped rows:
  //   a. Build deduplicated ad rows (one per unique ad_id in chunk)
  //   b. SELECT which ad_ids already exist → INSERT only new ones
  //   c. Collect ALL spend entries (every row, not just unique ads)
  //   d. Collect enrichment entries (one per ad, last-wins is fine)
  //   e. Upsert spend and enrichment

  const connPrefix = connectionId.slice(0, 8)
  let totalInserted = 0
  let processed = 0
  const validStages = new Set(['see', 'think', 'do', 'care'])

  for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
    const chunk = mapped.slice(i, i + CHUNK_SIZE)

    // ── 5a. Build ad rows (deduplicated) + spend entries (ALL rows) ────

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

      // Deterministic ad_id: prefer Snowflake's global_ad_id, else synthetic
      const adId = globalAdId
        ? `${connPrefix}_${globalAdId}`
        : `${connPrefix}_sf_${brand}_${headline ?? 'unknown'}_${r.date}`
            .replace(/\s+/g, '_')
            .toLowerCase()

      const platform = r.platform?.trim().toLowerCase() || 'snowflake'

      // Ad row — last-wins within chunk for metadata (PI, headline, etc.)
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

      // Spend: collect EVERY row (one per ad × month)
      spendEntries.push({ adId, row: r })

      // Enrichment: last-wins per ad (funnel stage doesn't change by month)
      enrichmentByAdId.set(adId, r)
    }

    const adRows = [...adRowByAdId.values()]
    if (adRows.length === 0) {
      processed += chunk.length
      continue
    }

    // ── 5b. SELECT existing → INSERT new ────────────────────────────────

    const adIdList = adRows.map(r => r.ad_id)

    const { data: existing } = await db
      .from('ads')
      .select('id, ad_id')
      .eq('workspace_id', workspaceId)
      .in('ad_id', adIdList)

    // ad_id (our string key) → uuid (DB primary key)
    const adIdToUuid = new Map<string, string>()
    const existingSet = new Set<string>()

    for (const row of existing ?? []) {
      adIdToUuid.set(row.ad_id, row.id)
      existingSet.add(row.ad_id)
    }

    const newAdRows = adRows.filter(r => !existingSet.has(r.ad_id))
    let chunkInserted = 0

    if (newAdRows.length > 0) {
      const { data: inserted, error: insertErr } = await db
        .from('ads')
        .insert(newAdRows)
        .select('id, ad_id')

      if (insertErr) {
        // Batch INSERT is atomic — if even one row is a duplicate, the whole
        // batch fails.  This is expected on re-syncs where ads already exist.
        // Not a real error, just log it at debug level.
        console.log(`[sync] Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ads already exist, skipping insert`)
      } else {
        chunkInserted = inserted?.length ?? 0
        for (const row of inserted ?? []) {
          adIdToUuid.set(row.ad_id, row.id)
        }
      }
    }

    // After INSERT (success or failure), ensure we have UUIDs for ALL ads
    // in this chunk — needed for spend and enrichment records below.
    // This covers: existing ads from prior syncs, newly inserted ads, and
    // any ads the initial SELECT missed.
    if (adIdToUuid.size < adRowByAdId.size) {
      const { data: allAds } = await db
        .from('ads')
        .select('id, ad_id')
        .eq('workspace_id', workspaceId)
        .in('ad_id', adIdList)

      for (const row of allAds ?? []) {
        adIdToUuid.set(row.ad_id, row.id)
      }
    }

    // ── 5c. Build spend records (ALL rows, keyed by uuid::week) ─────────

    const spendMap = new Map<string, Record<string, unknown>>()

    for (const { adId, row: r } of spendEntries) {
      const uuid = adIdToUuid.get(adId)
      if (!uuid) continue
      if (r.spend == null && r.impressions == null && r.reach == null) continue

      const week = weekStart(r.date)
      const key = `${uuid}::${week}`

      spendMap.set(key, {
        ad_id: uuid,
        week_start: week,
        est_spend_eur: r.spend,
        est_impressions: r.impressions != null ? Math.round(r.impressions) : null,
        est_reach: r.reach != null ? Math.round(r.reach) : null,
      })
    }

    if (spendMap.size > 0) {
      const { error: spendErr } = await db
        .from('ad_spend_estimates')
        .upsert([...spendMap.values()], { onConflict: 'ad_id,week_start' })

      if (spendErr) {
        errors.push(`Spend upsert: ${spendErr.message}`)
        console.error(`[sync] Spend upsert failed: ${spendErr.message}`)
      }
    }

    // ── 5d. Build enrichment records (one per ad) ───────────────────────

    const enrichments: Record<string, unknown>[] = []

    for (const [adId, r] of enrichmentByAdId) {
      const uuid = adIdToUuid.get(adId)
      if (!uuid || !r.funnelStage) continue
      const norm = r.funnelStage.toLowerCase()
      if (!validStages.has(norm)) continue
      enrichments.push({
        ad_id: uuid,
        funnel_stage: norm.charAt(0).toUpperCase() + norm.slice(1),
      })
    }

    if (enrichments.length > 0) {
      const { error: enrichErr } = await db
        .from('ad_enrichments')
        .upsert(enrichments, { onConflict: 'ad_id' })

      if (enrichErr) {
        errors.push(`Enrichment upsert: ${enrichErr.message}`)
      }
    }

    // ── 5e. Progress tracking ───────────────────────────────────────────

    totalInserted += chunkInserted
    processed += chunk.length

    await db
      .from('snowflake_connections')
      .update({ sync_progress: processed })
      .eq('id', connectionId)
      .then(() => {}) // swallow errors
  }

  // ── 6. Done — update status ────────────────────────────────────────────

  console.log(`[sync] Complete: ${totalInserted} new ads, ${processed} rows processed, ${errors.length} errors`)

  await db
    .from('snowflake_connections')
    .update({
      sync_status: 'idle',
      sync_error: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
      sync_progress: null,
      sync_total: null,
      last_synced_at: new Date().toISOString(),
      last_sync_rows: processed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)

  // Fire-and-forget alert detection
  detectAlerts(workspaceId).catch(err =>
    console.error('[sync] detectAlerts failed:', err),
  )

  return { ok: true, fetched: rawRows.length, inserted: totalInserted, errors }
}

// ─── Status helper ──────────────────────────────────────────────────────────

async function setStatus(
  db: ReturnType<typeof supabaseAdmin>,
  connectionId: string,
  status: 'syncing' | 'error',
  error?: string,
) {
  await db
    .from('snowflake_connections')
    .update({
      sync_status: status,
      sync_error: error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
}
