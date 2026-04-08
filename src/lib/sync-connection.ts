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

  // Count rows first so the UI can show a total immediately
  const countResult = await countSnowflakeRows(creds, mapping)
  if (countResult.ok && countResult.count != null) {
    await admin
      .from('snowflake_connections')
      .update({ sync_total: countResult.count, sync_progress: 0, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
  }

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
      .update({
        sync_status:   'error',
        sync_error:    'Snowflake returned 0 rows — check that the table has data and the column mapping is correct',
        sync_progress: null,
        sync_total:    null,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', connectionId)
    return { ok: false, fetched: 0, inserted: 0, errors: ['Snowflake returned 0 rows'] }
  }

  let inserted = 0
  const errors: string[] = []
  const connPrefix = connectionId.slice(0, 8)
  const validStages = ['See', 'Think', 'Do', 'Care']
  const PROGRESS_INTERVAL = 500 // update progress bar every N rows

  for (let i = 0; i < rows.length; i++) {
    const r = mapRow(rows[i], mapping)

    if (!r.brand || !r.date) {
      errors.push(`Skipped row: missing brand (${r.brand}) or date (${r.date})`)
      continue
    }

    // Find or create brand (case-insensitive match)
    let brand: { id: string } | null = null
    const { data: existing } = await admin
      .from('tracked_brands')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', r.brand)
      .eq('platform', 'snowflake')
      .maybeSingle()

    if (existing?.id) {
      brand = existing
    } else {
      const { data: brandInserted, error: brandErr } = await admin
        .from('tracked_brands')
        .insert({ workspace_id: workspaceId, name: r.brand, platform: 'snowflake', is_own_brand: false })
        .select('id')
        .single()
      if (brandErr) {
        errors.push(`Brand insert failed for "${r.brand}": ${brandErr.message}`)
        console.error(`[sync] brand insert error:`, brandErr)
      }
      brand = brandInserted
    }

    if (!brand?.id) continue

    // Normalise date
    const rawDate = r.date
    let isoDate: string
    if ((rawDate as unknown) instanceof Date) {
      isoDate = (rawDate as unknown as Date).toISOString().slice(0, 10)
    } else {
      const d = new Date(String(rawDate))
      isoDate = isNaN(d.getTime()) ? String(rawDate) : d.toISOString().slice(0, 10)
    }

    const adId = `${connPrefix}_sf_${r.brand}_${r.headline ?? 'unknown'}_${isoDate}`
      .replace(/\s+/g, '_').toLowerCase()

    const { data: ad, error: adErr } = await admin
      .from('ads')
      .upsert(
        {
          workspace_id:      workspaceId,
          brand_id:          brand.id,
          platform:          'meta',
          ad_id:             adId,
          headline:          r.headline,
          performance_index: r.performanceIndex,
          topic:             r.topic,
          first_seen_at:     isoDate,
          last_seen_at:      isoDate,
          is_active:         true,
          connection_id:     connectionId,
        },
        { onConflict: 'workspace_id,platform,ad_id' }
      )
      .select('id')
      .single()

    if (adErr) {
      errors.push(`Ad upsert failed for "${r.brand}": ${adErr.message}`)
      console.error(`[sync] ad upsert error:`, adErr)
    }
    if (!ad?.id) continue

    // Enrichment (funnel stage)
    if (r.funnelStage) {
      const stage = validStages.find(s => s.toLowerCase() === r.funnelStage?.toLowerCase())
      if (stage) {
        await admin.from('ad_enrichments').upsert(
          { ad_id: ad.id, funnel_stage: stage as 'See' | 'Think' | 'Do' | 'Care' },
          { onConflict: 'ad_id' }
        )
      }
    }

    // Spend estimate
    if (r.spend != null || r.impressions != null || r.reach != null) {
      const weekStart = getWeekStart(isoDate)
      await admin.from('ad_spend_estimates').upsert(
        {
          ad_id:           ad.id,
          week_start:      weekStart,
          est_spend_eur:   r.spend,
          est_impressions: r.impressions,
          est_reach:       r.reach,
        },
        { onConflict: 'ad_id,week_start' }
      )
    }

    inserted++

    // Update progress bar every PROGRESS_INTERVAL rows
    if (inserted % PROGRESS_INTERVAL === 0) {
      await admin
        .from('snowflake_connections')
        .update({ sync_progress: inserted, updated_at: new Date().toISOString() })
        .eq('id', connectionId)
    }
  }

  // Refresh weekly_metrics
  const affectedWeeks = [...new Set(
    rows.map(r => {
      const raw = mapRow(r, mapping).date
      const d = (raw as unknown) instanceof Date ? (raw as unknown as Date) : new Date(String(raw))
      return getWeekStart(isNaN(d.getTime()) ? String(raw) : d.toISOString().slice(0, 10))
    })
  )]
  for (const week of affectedWeeks) {
    await admin.rpc('refresh_weekly_metrics', { ws_id: workspaceId, week })
  }

  // Mark sync complete
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

  try {
    await detectAlerts(workspaceId)
  } catch (err) {
    console.error('[sync] detectAlerts failed:', err)
  }

  return { ok: true, fetched: rows.length, inserted, errors }
}
