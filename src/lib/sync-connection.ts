import { createClient as createAdminClient } from '@supabase/supabase-js'
import { countSnowflakeRows, fetchSnowflakeRows, mapRow, type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'
import { detectAlerts } from '@/lib/detect-alerts'

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function batchUpsert(
  admin: ReturnType<typeof createAdminClient<any>>,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  chunkSize = 1000
): Promise<string | null> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await admin.from(table).upsert(rows.slice(i, i + chunkSize), { onConflict })
    if (error) return error.message
  }
  return null
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

  // ── 2. Count rows first so UI can show total immediately ───────────────────
  const countResult = await countSnowflakeRows(creds, mapping)
  if (countResult.ok && countResult.count != null) {
    await admin
      .from('snowflake_connections')
      .update({ sync_total: countResult.count, sync_progress: 0, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
  }

  // ── 3. Fetch all rows ──────────────────────────────────────────────────────
  const fetchResult = await fetchSnowflakeRows(creds, mapping, undefined)

  if (!fetchResult.ok || !fetchResult.rows) {
    await admin
      .from('snowflake_connections')
      .update({ sync_status: 'error', sync_error: fetchResult.error, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
    return { ok: false, fetched: 0, inserted: 0, errors: [fetchResult.error ?? 'Fetch failed'] }
  }

  const rows = fetchResult.rows
  console.log(`[sync] Fetched ${rows.length} rows from Snowflake`)

  if (rows.length === 0) {
    await admin
      .from('snowflake_connections')
      .update({ sync_status: 'error', sync_error: 'Snowflake returned 0 rows — check table name, schema, and column mapping', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
    return { ok: false, fetched: 0, inserted: 0, errors: ['Snowflake returned 0 rows'] }
  }

  // ── 4. Map all rows ────────────────────────────────────────────────────────
  const mappedRows = rows.map(raw => mapRow(raw, mapping))

  // ── 5. Brand cache — load existing, upsert new ones ───────────────────────
  const errors: string[] = []
  const connPrefix = connectionId.slice(0, 8)
  const validStages = ['See', 'Think', 'Do', 'Care']

  const { data: existingBrands } = await admin
    .from('tracked_brands')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'snowflake')

  const brandCache = new Map<string, string>() // lowercased name → uuid
  for (const b of existingBrands ?? []) {
    brandCache.set(b.name.toLowerCase().trim(), b.id)
  }

  // Collect new brand names not yet in cache
  const newBrandMap = new Map<string, string>() // normalized → original casing
  for (const r of mappedRows) {
    if (!r.brand) continue
    const key = r.brand.toLowerCase().trim()
    if (!brandCache.has(key) && !newBrandMap.has(key)) {
      newBrandMap.set(key, r.brand)
    }
  }

  if (newBrandMap.size > 0) {
    const toInsert = [...newBrandMap.values()].map(name => ({
      workspace_id: workspaceId,
      name,
      platform:     'snowflake' as const,
      is_own_brand: false,
    }))
    // Upsert brands, then SELECT them back separately (upsert+select unreliable for large batches)
    const { error: brandUpsertErr } = await admin
      .from('tracked_brands')
      .upsert(toInsert, { onConflict: 'workspace_id,name,platform' })
    if (brandUpsertErr) {
      errors.push(`Brand upsert failed: ${brandUpsertErr.message}`)
      console.error('[sync] brand upsert error:', brandUpsertErr)
    } else {
      // Fetch back in pages to get IDs for newly upserted brands
      const { data: freshBrands } = await admin
        .from('tracked_brands')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'snowflake')
      for (const b of freshBrands ?? []) {
        brandCache.set(b.name.toLowerCase().trim(), b.id)
      }
    }
  }

  // ── 6. Build all ad rows ───────────────────────────────────────────────────
  const allAdRows: Record<string, unknown>[] = []
  const allValidEntries: { r: ReturnType<typeof mapRow>; adId: string }[] = []

  for (const r of mappedRows) {
    if (!r.brand || !r.date) continue
    const brandId = brandCache.get(r.brand.toLowerCase().trim())
    if (!brandId) {
      errors.push(`No brand ID for "${r.brand}", skipping`)
      continue
    }
    const adId = `${connPrefix}_sf_${r.brand}_${r.headline ?? 'unknown'}_${r.date}`
      .toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 200)

    allAdRows.push({
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
    allValidEntries.push({ r, adId })
  }

  console.log(`[sync] Built ${allAdRows.length} ad rows from ${mappedRows.length} mapped rows (brandCache=${brandCache.size})`)

  // ── 7. Upsert ads in chunks, update progress bar ───────────────────────────
  const CHUNK_SIZE = 1000
  for (let i = 0; i < allAdRows.length; i += CHUNK_SIZE) {
    const chunk = allAdRows.slice(i, i + CHUNK_SIZE)
    const { error: adErr } = await admin
      .from('ads')
      .upsert(chunk, { onConflict: 'workspace_id,platform,ad_id' })
    if (adErr) {
      errors.push(`Ad upsert chunk ${i} failed: ${adErr.message}`)
      console.error('[sync] ad upsert error:', adErr)
    }
    await admin
      .from('snowflake_connections')
      .update({ sync_progress: Math.min(i + CHUNK_SIZE, allAdRows.length), updated_at: new Date().toISOString() })
      .eq('id', connectionId)
  }

  // ── 8. Fetch ALL ad UUIDs for this connection (paginated, avoids .in() limits) ─
  const adIdToUuid = new Map<string, string>()
  const PAGE_SIZE = 1000
  let page = 0
  while (true) {
    const { data: pageAds, error: pageErr } = await admin
      .from('ads')
      .select('id, ad_id')
      .eq('connection_id', connectionId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (pageErr) {
      errors.push(`UUID fetch page ${page} failed: ${pageErr.message}`)
      console.error('[sync] uuid page fetch error:', pageErr)
      break
    }
    if (!pageAds || pageAds.length === 0) break
    for (const ad of pageAds) adIdToUuid.set(ad.ad_id, ad.id)
    if (pageAds.length < PAGE_SIZE) break
    page++
  }
  console.log(`[sync] Fetched ${adIdToUuid.size} UUIDs for connection`)

  // ── 9. Build enrichment + spend rows ──────────────────────────────────────
  const enrichmentMap = new Map<string, Record<string, unknown>>()
  const spendMap      = new Map<string, Record<string, unknown>>()
  let inserted = 0

  for (const { r, adId } of allValidEntries) {
    const uuid = adIdToUuid.get(adId)
    if (!uuid) continue

    if (r.funnelStage) {
      const stage = validStages.find(s => s.toLowerCase() === r.funnelStage?.toLowerCase())
      if (stage) enrichmentMap.set(uuid, { ad_id: uuid, funnel_stage: stage })
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

  // ── 10. Batch upsert enrichment + spend ────────────────────────────────────
  if (enrichmentMap.size > 0) {
    const enrichErr = await batchUpsert(admin, 'ad_enrichments', [...enrichmentMap.values()], 'ad_id')
    if (enrichErr) {
      errors.push(`Enrichment upsert failed: ${enrichErr}`)
      console.error('[sync] enrichment error:', enrichErr)
    }
  }

  if (spendMap.size > 0) {
    const spendErr = await batchUpsert(admin, 'ad_spend_estimates', [...spendMap.values()], 'ad_id,week_start')
    if (spendErr) {
      errors.push(`Spend upsert failed: ${spendErr}`)
      console.error('[sync] spend error:', spendErr)
    }
  }

  console.log(`[sync] inserted=${inserted}, enrichment=${enrichmentMap.size}, spend=${spendMap.size}, errors=${errors.length}`)

  // ── 11. Refresh weekly_metrics ─────────────────────────────────────────────
  const affectedWeeks = [...new Set(mappedRows.filter(r => r.date).map(r => getWeekStart(r.date)))]
  for (const week of affectedWeeks) {
    await admin.rpc('refresh_weekly_metrics', { ws_id: workspaceId, week })
  }

  // ── 12. Mark sync complete ─────────────────────────────────────────────────
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

  // ── 13. Alert detection ────────────────────────────────────────────────────
  try {
    await detectAlerts(workspaceId)
  } catch (err) {
    console.error('[sync] detectAlerts failed:', err)
  }

  return { ok: true, fetched: rows.length, inserted, errors }
}
