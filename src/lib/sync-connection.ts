import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fetchSnowflakeRows, mapRow, type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'
import { detectAlerts } from '@/lib/detect-alerts'

const CHUNK_SIZE = 200  // Supabase free tier has ~5s statement timeout; 200 rows ≈ 1-2s

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

export async function syncConnection(
  connectionId: string,
  workspaceId: string
): Promise<{ ok: boolean; fetched: number; inserted: number; errors: string[] }> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Load connection config
  const { data: conn, error: connErr } = await admin
    .from('snowflake_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (connErr || !conn) {
    return { ok: false, fetched: 0, inserted: 0, errors: ['No Snowflake connection configured'] }
  }

  // Mark as syncing
  await admin
    .from('snowflake_connections')
    .update({ sync_status: 'syncing', updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  const creds: SnowflakeCreds = {
    account:        conn.account,
    username:       conn.username,
    password:       conn.password ?? undefined,
    privateKey:     conn.private_key ?? undefined,
    privateKeyPass: conn.private_key_pass ?? undefined,
    role:           conn.role ?? undefined,
    warehouse:      conn.warehouse,
    database:       conn.database,
    schema:         conn.schema,
  }

  const mapping: SnowflakeMapping = {
    table:          conn.table_name,
    colBrand:       conn.col_brand,
    colDate:        conn.col_date,
    colHeadline:    conn.col_headline    ?? undefined,
    colSpend:       conn.col_spend       ?? undefined,
    colImpressions: conn.col_impressions ?? undefined,
    colReach:       conn.col_reach       ?? undefined,
    colPi:          conn.col_pi          ?? undefined,
    colFunnel:      conn.col_funnel      ?? undefined,
    colTopic:       conn.col_topic       ?? undefined,
    colThumbnail:   conn.col_thumbnail   ?? undefined,
    colAdId:        conn.col_ad_id       ?? undefined,
    colPlatform:    conn.col_platform    ?? undefined,
    colIsActive:    conn.col_is_active   ?? undefined,
    colFormat:      conn.col_format      ?? undefined,
  }

  const fetchResult = await fetchSnowflakeRows(creds, mapping, undefined)

  if (!fetchResult.ok || !fetchResult.rows) {
    await admin
      .from('snowflake_connections')
      .update({ sync_status: 'error', sync_error: fetchResult.error, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
    return { ok: false, fetched: 0, inserted: 0, errors: [fetchResult.error ?? 'Fetch failed'] }
  }

  const rawRows = fetchResult.rows
  console.log(`[sync] Fetched ${rawRows.length} rows from Snowflake`)

  // ── Step 1: Map all rows upfront ──────────────────────────────────────────
  const mappedRows = rawRows.map(raw => mapRow(raw, mapping))

  // Write total so UI can show progress
  try {
    await admin
      .from('snowflake_connections')
      .update({ sync_progress: 0, sync_total: mappedRows.length })
      .eq('id', connectionId)
  } catch (_) {}

  // ── Step 2: Pre-load brand cache (1 query instead of up to N) ─────────────
  const { data: existingBrands, error: brandsLoadErr } = await admin
    .from('tracked_brands')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'snowflake')

  if (brandsLoadErr) {
    console.error('[sync] Failed to load brand cache:', brandsLoadErr.message)
    // Likely means "snowflake" is not a valid platform enum value → run migration 017
    await admin.from('snowflake_connections').update({
      sync_status: 'error',
      sync_error:  `Brand cache load failed: ${brandsLoadErr.message} — run migration 017 to add snowflake platform enum`,
      updated_at:  new Date().toISOString(),
    }).eq('id', connectionId)
    return { ok: false, fetched: rawRows.length, inserted: 0, errors: [brandsLoadErr.message] }
  }

  const brandCache = new Map<string, string>() // lowercased name → uuid
  for (const b of existingBrands ?? []) {
    brandCache.set(b.name.toLowerCase().trim(), b.id)
  }

  // ── Step 3: Collect unique new brands → batch upsert (1 query) ───────────
  const newBrandMap = new Map<string, string>() // normalised → original casing
  for (const r of mappedRows) {
    if (!r.brand) continue
    const key = r.brand.toLowerCase().trim()
    if (!brandCache.has(key) && !newBrandMap.has(key)) {
      newBrandMap.set(key, r.brand)
    }
  }
  if (newBrandMap.size > 0) {
    // Use ON CONFLICT DO NOTHING (ignoreDuplicates) so that brands which already
    // exist in a concurrent sync or from a previous run don't throw 23505 errors.
    // Then fetch ALL brand names in a single SELECT to populate the cache — this
    // covers both newly inserted rows and pre-existing ones skipped by DO NOTHING.
    const { error: brandErr } = await admin
      .from('tracked_brands')
      .upsert(
        [...newBrandMap.values()].map(name => ({
          workspace_id: workspaceId,
          name,
          platform: 'snowflake',
          is_own_brand: false,
        })),
        { onConflict: 'workspace_id,name,platform', ignoreDuplicates: true }
      )

    if (brandErr) {
      console.error('[sync] Brand insert failed:', brandErr.message)
      await admin.from('snowflake_connections').update({
        sync_status: 'error',
        sync_error:  `Brand insert failed: ${brandErr.message}`,
        updated_at:  new Date().toISOString(),
      }).eq('id', connectionId)
      return { ok: false, fetched: rawRows.length, inserted: 0, errors: [brandErr.message] }
    }

    // Reload brand cache to pick up any rows just inserted + existing ones
    const { data: allBrands } = await admin
      .from('tracked_brands')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'snowflake')
    for (const b of allBrands ?? []) {
      brandCache.set(b.name.toLowerCase().trim(), b.id)
    }
  }

  console.log(`[sync] Brand cache ready: ${brandCache.size} brands`)

  // ── Step 4: Chunked upsert loop ───────────────────────────────────────────
  const errors: string[] = []
  let inserted = 0
  let processed = 0
  const validStages = new Set(['see', 'think', 'do', 'care'])
  const connPrefix = connectionId.slice(0, 8)

  for (let i = 0; i < mappedRows.length; i += CHUNK_SIZE) {
    const chunk = mappedRows.slice(i, i + CHUNK_SIZE)

    // Build ad rows for this chunk — use a Map keyed by conflict key so
    // duplicates within the same chunk are collapsed (last row wins, which
    // carries the most-recent spend/PI values from Snowflake's ordering).
    //
    // IMPORTANT: The Snowflake view is a monthly snapshot, so the same ad
    // appears once per month.  We must collect ALL rows for spend (not just
    // the last one per ad) while still deduplicating the core ad record.
    const adRowMap       = new Map<string, Record<string, unknown>>()
    const enrichmentRowMap = new Map<string, typeof mappedRows[0]>() // adId → last row (for funnel stage; doesn't change month-to-month)
    const spendEntries: Array<{ adId: string; r: typeof mappedRows[0] }> = [] // ALL rows — one spend entry per month per ad

    for (const r of chunk) {
      if (!r.brand || !r.date) {
        errors.push(`Skipped row: missing brand (${r.brand}) or date (${r.date})`)
        continue
      }

      const brandId = brandCache.get(r.brand.toLowerCase().trim())
      if (!brandId) {
        errors.push(`No brand ID for "${r.brand}", skipping`)
        continue
      }

      // Trim all string fields — Snowflake can return values with trailing spaces
      const globalAdId = r.globalAdId?.trim() ?? null
      const brand      = r.brand.trim()
      const headline   = r.headline?.trim() ?? null

      // Determine ad_id:
      //   • If global_ad_id is available (col_ad_id was mapped), use it directly
      //   • Otherwise fall back to synthetic key (legacy behaviour)
      const adId = globalAdId
        ? `${connPrefix}_${globalAdId}`
        : `${connPrefix}_sf_${brand}_${headline ?? 'unknown'}_${r.date}`
            .replace(/\s+/g, '_').toLowerCase()

      // Platform: use Snowflake's source_platform if available, else 'snowflake'
      const platform = (r.platform?.trim().toLowerCase()) ?? 'snowflake'

      // Conflict key matches the upsert constraint: (workspace_id, platform, ad_id)
      const conflictKey = `${workspaceId}::${platform}::${adId}`

      // Build the core payload — always safe regardless of migration state
      const adPayload: Record<string, unknown> = {
        workspace_id:      workspaceId,
        brand_id:          brandId,
        platform,
        ad_id:             adId,
        headline,
        performance_index: r.performanceIndex,
        topic:             r.topic?.trim() ?? null,
        thumbnail_url:     r.thumbnailUrl?.trim() ?? null,
        first_seen_at:     r.date,
        last_seen_at:      r.date,
        is_active:         r.isActive ?? true,
        connection_id:     connectionId,
      }
      // Include migration-025 columns only when non-null (safe if migration not yet run)
      if (globalAdId)              adPayload.global_ad_id    = globalAdId
      if (r.platform?.trim())      adPayload.source_platform = r.platform.trim()
      if (r.format?.trim())        adPayload.format_type     = r.format.trim()

      adRowMap.set(conflictKey, adPayload)
      enrichmentRowMap.set(adId, r)  // last-wins is fine; funnel stage doesn't vary by month
      spendEntries.push({ adId, r }) // collect ALL rows so every month gets a spend record
    }

    const adRows = [...adRowMap.values()]

    if (adRows.length === 0) continue

    // ── Strategy: avoid ON CONFLICT entirely ────────────────────────────────
    // Supabase hosted PostgREST ignores the `Prefer: resolution=ignore-duplicates`
    // header and always generates ON CONFLICT DO UPDATE, which triggers
    // "affect row a second time" when two rows in the same batch share a
    // secondary unique index value.  Instead we:
    //   1. SELECT which ad_ids already exist  (1 query, no conflict)
    //   2. INSERT only the genuinely new rows  (plain insert, no conflict clause)
    //   3. Build adIdMap from both existing + newly inserted rows

    const adIdList = adRows.map(r => r.ad_id as string)

    // Step A — find pre-existing rows for this chunk
    const { data: existingAds } = await admin
      .from('ads')
      .select('id, ad_id')
      .eq('workspace_id', workspaceId)
      .in('ad_id', adIdList)

    const adIdMap = new Map<string, string>()
    const existingAdIdSet = new Set<string>()
    for (const a of existingAds ?? []) {
      adIdMap.set(a.ad_id, a.id)
      existingAdIdSet.add(a.ad_id)
    }

    // Step B — insert only rows that don't exist yet
    const newAdRows = adRows.filter(r => !existingAdIdSet.has(r.ad_id as string))
    let chunkInserted = 0
    if (newAdRows.length > 0) {
      const { data: insertedAds, error: insertErr } = await admin
        .from('ads')
        .insert(newAdRows)
        .select('id, ad_id')

      if (insertErr) {
        const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
        errors.push(`Ad insert failed (chunk ${chunkNum}): ${insertErr.message}`)
        // On insert failure, fall back to a SELECT so enrichment/spend still run
        // for the pre-existing ads we already have in adIdMap.
        console.warn(`[sync] Insert failed chunk ${chunkNum}, continuing with existing ads only`)
      } else {
        chunkInserted = insertedAds?.length ?? 0
        for (const a of insertedAds ?? []) adIdMap.set(a.ad_id, a.id)
      }
    }

    // Build enrichment + spend maps
    const enrichmentMap = new Map<string, Record<string, unknown>>() // uuid → row
    const spendMap      = new Map<string, Record<string, unknown>>() // `uuid::week` → row

    // Enrichment: funnel stage — iterate deduplicated map (last-wins per ad is fine)
    for (const [adId, r] of enrichmentRowMap) {
      const uuid = adIdMap.get(adId)
      if (!uuid) continue

      if (r.funnelStage) {
        const norm = r.funnelStage.toLowerCase()
        if (validStages.has(norm)) {
          const stage = norm.charAt(0).toUpperCase() + norm.slice(1) // "see" → "See"
          enrichmentMap.set(uuid, { ad_id: uuid, funnel_stage: stage })
        }
      }
    }

    // Spend: iterate ALL rows so every Snowflake month gets its own spend record.
    // The map key is uuid::weekStart which naturally deduplicates if the same
    // ad×week appears more than once in a chunk.
    for (const { adId, r } of spendEntries) {
      const uuid = adIdMap.get(adId)
      if (!uuid) continue

      if (r.spend != null || r.impressions != null || r.reach != null) {
        const weekStart = getWeekStart(r.date)
        const spendKey = `${uuid}::${weekStart}`
        spendMap.set(spendKey, {
          ad_id:           uuid,
          week_start:      weekStart,
          est_spend_eur:   r.spend,
          est_impressions: r.impressions,
          est_reach:       r.reach,
        })
      }
    }

    // Batch enrichment upsert
    if (enrichmentMap.size > 0) {
      await admin
        .from('ad_enrichments')
        .upsert([...enrichmentMap.values()], { onConflict: 'ad_id' })
    }

    // Batch spend upsert
    if (spendMap.size > 0) {
      await admin
        .from('ad_spend_estimates')
        .upsert([...spendMap.values()], { onConflict: 'ad_id,week_start' })
    }

    // Count only genuinely new rows successfully inserted this chunk
    inserted  += chunkInserted
    processed += chunk.length

    // Progress update once per chunk
    try {
      await admin
        .from('snowflake_connections')
        .update({ sync_progress: processed })
        .eq('id', connectionId)
    } catch (_) {}
  }

  // ── Step 5: Refresh weekly metrics for affected weeks ─────────────────────
  const affectedWeeks = [...new Set(
    mappedRows
      .filter(r => r.date)
      .map(r => getWeekStart(r.date))
  )]

  for (const week of affectedWeeks) {
    await admin.rpc('refresh_weekly_metrics', { ws_id: workspaceId, week })
  }

  // ── Step 6: Final status update ───────────────────────────────────────────
  await admin
    .from('snowflake_connections')
    .update({
      sync_status:    'idle',
      sync_error:     null,
      sync_progress:  null,
      sync_total:     null,
      last_synced_at: new Date().toISOString(),
      last_sync_rows: inserted,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', connectionId)

  // Run alert detection after a successful sync
  try {
    await detectAlerts(workspaceId)
  } catch (err) {
    console.error('[sync] detectAlerts failed:', err)
  }

  return { ok: true, fetched: rawRows.length, inserted, errors }
}
