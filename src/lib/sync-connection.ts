import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fetchSnowflakeRows, mapRow, type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'
import { detectAlerts } from '@/lib/detect-alerts'

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

  // ── 1. Load connection config ──────────────────────────────────────────────
  const { data: conn, error: connErr } = await admin
    .from('snowflake_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (connErr || !conn) {
    return { ok: false, fetched: 0, inserted: 0, errors: ['No Snowflake connection configured'] }
  }

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
    colHeadline:    conn.col_headline ?? undefined,
    colSpend:       conn.col_spend ?? undefined,
    colImpressions: conn.col_impressions ?? undefined,
    colReach:       conn.col_reach ?? undefined,
    colPi:          conn.col_pi ?? undefined,
    colFunnel:      conn.col_funnel ?? undefined,
    colTopic:       conn.col_topic ?? undefined,
  }

  // ── 2. Fetch all rows from Snowflake ───────────────────────────────────────
  const fetchResult = await fetchSnowflakeRows(creds, mapping, undefined)

  if (!fetchResult.ok || !fetchResult.rows) {
    await admin
      .from('snowflake_connections')
      .update({ sync_status: 'error', sync_error: fetchResult.error, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
    return { ok: false, fetched: 0, inserted: 0, errors: [fetchResult.error ?? 'Fetch failed'] }
  }

  const rows = fetchResult.rows
  const total = rows.length
  console.log(`[sync] Fetched ${total} rows from Snowflake`)

  await admin
    .from('snowflake_connections')
    .update({ sync_total: total, sync_progress: 0, updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  // ── 3. Map all rows upfront (normalizes dates via toISODate in mapRow) ─────
  const mappedRows = rows.map(raw => mapRow(raw, mapping))

  // ── 4. Pre-load brand cache (1 query, replaces per-row ilike lookups) ──────
  const { data: existingBrands } = await admin
    .from('tracked_brands')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'snowflake')

  const brandCache = new Map<string, string>() // lowercased name → uuid
  for (const b of existingBrands ?? []) {
    brandCache.set(b.name.toLowerCase().trim(), b.id)
  }

  // ── 5. Collect unique new brand names not in cache ─────────────────────────
  // Preserves first-seen casing — same guarantee as original ilike dedup
  const newBrandMap = new Map<string, string>() // normalized → original casing
  for (const r of mappedRows) {
    if (!r.brand) continue
    const key = r.brand.toLowerCase().trim()
    if (!brandCache.has(key) && !newBrandMap.has(key)) {
      newBrandMap.set(key, r.brand)
    }
  }

  // ── 6. Batch insert new brands (1 query, replaces per-row inserts) ─────────
  const errors: string[] = []

  if (newBrandMap.size > 0) {
    const toInsert = [...newBrandMap.values()].map(name => ({
      workspace_id: workspaceId,
      name,
      platform:     'snowflake' as const,
      is_own_brand: false,
    }))
    const { data: insertedBrands, error: brandBatchErr } = await admin
      .from('tracked_brands')
      .upsert(toInsert, { onConflict: 'workspace_id,name,platform' })
      .select('id, name')
    if (brandBatchErr) {
      errors.push(`Brand batch insert failed: ${brandBatchErr.message}`)
      console.error('[sync] brand batch error:', brandBatchErr)
    } else {
      for (const b of insertedBrands ?? []) {
        brandCache.set(b.name.toLowerCase().trim(), b.id)
      }
    }
  }

  // ── 7. Chunked loop — batch upserts per 1,000 rows ─────────────────────────
  const CHUNK_SIZE = 1000
  const connPrefix = connectionId.slice(0, 8)
  const validStages = ['See', 'Think', 'Do', 'Care']
  let inserted = 0

  for (let chunkStart = 0; chunkStart < mappedRows.length; chunkStart += CHUNK_SIZE) {
    const chunk = mappedRows.slice(chunkStart, chunkStart + CHUNK_SIZE)

    // Build ad rows for this chunk
    const adRows: Record<string, unknown>[] = []
    const validEntries: { r: ReturnType<typeof mapRow>; adId: string }[] = []

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

      const adId = `${connPrefix}_sf_${r.brand}_${r.headline ?? 'unknown'}_${r.date}`
        .replace(/\s+/g, '_').toLowerCase()

      adRows.push({
        workspace_id:      workspaceId,
        brand_id:          brandId,
        platform:          'meta',
        ad_id:             adId,
        headline:          r.headline,
        performance_index: r.performanceIndex,
        topic:             r.topic,
        first_seen_at:     r.date,
        last_seen_at:      r.date,
        is_active:         true,
        connection_id:     connectionId,
      })
      validEntries.push({ r, adId })
    }

    if (adRows.length === 0) {
      await admin
        .from('snowflake_connections')
        .update({ sync_progress: chunkStart + chunk.length, updated_at: new Date().toISOString() })
        .eq('id', connectionId)
      continue
    }

    // Single batch ad upsert for this chunk (~1 query per 1,000 rows)
    const { data: upsertedAds, error: adBatchErr } = await admin
      .from('ads')
      .upsert(adRows, { onConflict: 'workspace_id,platform,ad_id' })
      .select('id, ad_id')

    if (adBatchErr) {
      errors.push(`Chunk ${chunkStart}–${chunkStart + chunk.length} ad upsert failed: ${adBatchErr.message}`)
      console.error('[sync] chunk ad upsert error:', adBatchErr)
      await admin
        .from('snowflake_connections')
        .update({ sync_progress: chunkStart + chunk.length, updated_at: new Date().toISOString() })
        .eq('id', connectionId)
      continue
    }

    // Build ad_id text → uuid map from returned rows
    const adIdToUuid = new Map<string, string>()
    for (const ad of upsertedAds ?? []) {
      adIdToUuid.set(ad.ad_id, ad.id)
    }

    // Collect enrichment + spend rows, deduplicated within chunk to avoid PK conflicts
    const enrichmentMap = new Map<string, Record<string, unknown>>()  // uuid → row
    const spendMap      = new Map<string, Record<string, unknown>>()  // "uuid::week" → row

    for (const { r, adId } of validEntries) {
      const uuid = adIdToUuid.get(adId)
      if (!uuid) continue

      if (r.funnelStage) {
        const stage = validStages.find(s => s.toLowerCase() === r.funnelStage?.toLowerCase())
        if (stage) {
          enrichmentMap.set(uuid, { ad_id: uuid, funnel_stage: stage })
        }
      }

      if (r.spend != null || r.impressions != null || r.reach != null) {
        const weekStart = getWeekStart(r.date)
        spendMap.set(`${uuid}::${weekStart}`, {
          ad_id:           uuid,
          week_start:      weekStart,
          est_spend_eur:   r.spend,
          est_impressions: r.impressions,
          est_reach:       r.reach,
        })
      }

      inserted++
    }

    // Single batch enrichment upsert
    if (enrichmentMap.size > 0) {
      const { error: enrichErr } = await admin
        .from('ad_enrichments')
        .upsert([...enrichmentMap.values()], { onConflict: 'ad_id' })
      if (enrichErr) {
        errors.push(`Chunk ${chunkStart} enrichment upsert failed: ${enrichErr.message}`)
        console.error('[sync] enrichment batch error:', enrichErr)
      }
    }

    // Single batch spend upsert
    if (spendMap.size > 0) {
      const { error: spendErr } = await admin
        .from('ad_spend_estimates')
        .upsert([...spendMap.values()], { onConflict: 'ad_id,week_start' })
      if (spendErr) {
        errors.push(`Chunk ${chunkStart} spend upsert failed: ${spendErr.message}`)
        console.error('[sync] spend batch error:', spendErr)
      }
    }

    // Progress update once per chunk
    await admin
      .from('snowflake_connections')
      .update({ sync_progress: chunkStart + chunk.length, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
  }

  // ── 8. Refresh weekly_metrics for affected weeks ───────────────────────────
  const affectedWeeks = [...new Set(
    mappedRows.filter(r => r.date).map(r => getWeekStart(r.date))
  )]

  for (const week of affectedWeeks) {
    await admin.rpc('refresh_weekly_metrics', { ws_id: workspaceId, week })
  }

  // ── 9. Mark sync complete ──────────────────────────────────────────────────
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

  // ── 10. Alert detection ────────────────────────────────────────────────────
  try {
    await detectAlerts(workspaceId)
  } catch (err) {
    console.error('[sync] detectAlerts failed:', err)
  }

  return { ok: true, fetched: rows.length, inserted, errors }
}
