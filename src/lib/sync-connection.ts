import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fetchSnowflakeRows, mapRow, type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'
import { detectAlerts } from '@/lib/detect-alerts'

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
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

  // 1. Load connection config
  const { data: conn, error: connErr } = await admin
    .from('snowflake_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (connErr || !conn) {
    return { ok: false, fetched: 0, inserted: 0, errors: ['Connection not found'] }
  }

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

  // 2. Fetch all rows from Snowflake via streaming
  console.log(`[sync] Fetching from ${creds.database}.${creds.schema}.${mapping.table}`)
  const fetchResult = await fetchSnowflakeRows(creds, mapping)

  if (!fetchResult.ok || !fetchResult.rows) {
    await admin
      .from('snowflake_connections')
      .update({ sync_status: 'error', sync_error: fetchResult.error ?? 'Fetch failed', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
    return { ok: false, fetched: 0, inserted: 0, errors: [fetchResult.error ?? 'Fetch failed'] }
  }

  const rows = fetchResult.rows
  console.log(`[sync] Fetched ${rows.length} rows`)

  if (rows.length === 0) {
    await admin
      .from('snowflake_connections')
      .update({ sync_status: 'error', sync_error: 'Snowflake returned 0 rows — check table name and column mapping', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
    return { ok: false, fetched: 0, inserted: 0, errors: ['0 rows returned'] }
  }

  // 3. Insert rows one by one
  let inserted = 0
  const errors: string[] = []
  const connPrefix = connectionId.slice(0, 8)
  const validStages = ['See', 'Think', 'Do', 'Care']

  for (const raw of rows) {
    const r = mapRow(raw, mapping)

    if (!r.brand || !r.date) continue

    // Find or create brand
    let brandId: string | null = null
    const { data: existing } = await admin
      .from('tracked_brands')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', r.brand)
      .eq('platform', 'snowflake')
      .maybeSingle()

    if (existing?.id) {
      brandId = existing.id
    } else {
      const { data: created, error: brandErr } = await admin
        .from('tracked_brands')
        .insert({ workspace_id: workspaceId, name: r.brand, platform: 'snowflake', is_own_brand: false })
        .select('id')
        .single()
      if (brandErr) {
        errors.push(`Brand insert failed: ${brandErr.message}`)
      } else {
        brandId = created?.id ?? null
      }
    }

    if (!brandId) continue

    // Upsert ad
    const adId = `${connPrefix}_sf_${r.brand}_${r.headline ?? 'unknown'}_${r.date}`
      .replace(/\s+/g, '_').toLowerCase()

    const { data: ad, error: adErr } = await admin
      .from('ads')
      .upsert(
        {
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
        },
        { onConflict: 'workspace_id,platform,ad_id' }
      )
      .select('id')
      .single()

    if (adErr || !ad?.id) {
      errors.push(`Ad upsert failed: ${adErr?.message}`)
      continue
    }

    // Enrichment
    if (r.funnelStage) {
      const stage = validStages.find(s => s.toLowerCase() === r.funnelStage?.toLowerCase())
      if (stage) {
        await admin.from('ad_enrichments').upsert(
          { ad_id: ad.id, funnel_stage: stage as 'See' | 'Think' | 'Do' | 'Care' },
          { onConflict: 'ad_id' }
        )
      }
    }

    // Spend
    if (r.spend != null || r.impressions != null || r.reach != null) {
      await admin.from('ad_spend_estimates').upsert(
        { ad_id: ad.id, week_start: getWeekStart(r.date), est_spend_eur: r.spend, est_impressions: r.impressions, est_reach: r.reach },
        { onConflict: 'ad_id,week_start' }
      )
    }

    inserted++

    if (inserted % 100 === 0) {
      console.log(`[sync] ${inserted} / ${rows.length} inserted`)
    }
  }

  console.log(`[sync] Done: ${inserted} inserted, ${errors.length} errors`)

  // 4. Refresh weekly metrics
  const weeks = [...new Set(rows.map(raw => {
    const d = mapRow(raw, mapping).date
    return getWeekStart(d)
  }).filter(Boolean))]
  for (const week of weeks) {
    await admin.rpc('refresh_weekly_metrics', { ws_id: workspaceId, week })
  }

  // 5. Mark complete
  await admin
    .from('snowflake_connections')
    .update({
      sync_status:    'idle',
      sync_error:     errors.length > 0 ? errors[0] : null,
      last_synced_at: new Date().toISOString(),
      last_sync_rows: inserted,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', connectionId)

  try { await detectAlerts(workspaceId) } catch (e) { console.error('[sync] detectAlerts failed:', e) }

  return { ok: true, fetched: rows.length, inserted, errors }
}
