import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fetchSnowflakeRows, mapRow, type SnowflakeCreds, type SnowflakeMapping } from '@/lib/snowflake'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { workspaceId } = await req.json() as { workspaceId: string }
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Load connection config
  const { data: conn, error: connErr } = await admin
    .from('snowflake_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (connErr || !conn) {
    return NextResponse.json({ error: 'No Snowflake connection configured' }, { status: 404 })
  }

  // Mark as syncing
  await admin
    .from('snowflake_connections')
    .update({ sync_status: 'syncing', updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)

  const creds: SnowflakeCreds = {
    account:   conn.account,
    username:  conn.username,
    password:  conn.password,
    role:      conn.role ?? undefined,
    warehouse: conn.warehouse,
    database:  conn.database,
    schema:    conn.schema,
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

  // Always full sync — incremental filtering by date would skip historical data
  const fetchResult = await fetchSnowflakeRows(creds, mapping, undefined)

  if (!fetchResult.ok || !fetchResult.rows) {
    await admin
      .from('snowflake_connections')
      .update({ sync_status: 'error', sync_error: fetchResult.error, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
    return NextResponse.json({ error: fetchResult.error }, { status: 500 })
  }

  const rows = fetchResult.rows
  console.log(`[sync] Fetched ${rows.length} rows from Snowflake`)
  let inserted = 0
  const errors: string[] = []

  for (const raw of rows) {
    const r = mapRow(raw, mapping)
    if (!r.brand || !r.date) {
      errors.push(`Skipped row: missing brand (${r.brand}) or date (${r.date})`)
      continue
    }

    // Find or create tracked_brand
    let brand: { id: string } | null = null
    const { data: existing } = await admin
      .from('tracked_brands')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', r.brand)
      .eq('platform', 'meta')
      .maybeSingle()

    if (existing?.id) {
      brand = existing
    } else {
      const { data: brandInserted, error: brandErr } = await admin
        .from('tracked_brands')
        .insert({ workspace_id: workspaceId, name: r.brand, platform: 'meta', is_own_brand: false })
        .select('id')
        .single()
      if (brandErr) {
        const msg = `Brand insert failed for "${r.brand}": ${brandErr.message}`
        errors.push(msg)
        console.error(`[sync] ${msg}`)
      }
      brand = brandInserted
    }

    if (!brand?.id) {
      console.error(`[sync] No brand ID for "${r.brand}", skipping`)
      continue
    }

    // Normalise date — Snowflake DATE columns come back as JS Date objects
    const rawDate = r.date
    let isoDate: string
    if (rawDate instanceof Date) {
      isoDate = rawDate.toISOString().slice(0, 10)
    } else {
      const d = new Date(String(rawDate))
      isoDate = isNaN(d.getTime()) ? String(rawDate) : d.toISOString().slice(0, 10)
    }

    // Upsert ad
    const adId = `sf_${r.brand}_${r.headline ?? 'unknown'}_${isoDate}`.replace(/\s+/g, '_').toLowerCase()
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
        },
        { onConflict: 'workspace_id,platform,ad_id' }
      )
      .select('id')
      .single()

    if (adErr) {
      const msg = `Ad upsert failed for "${r.brand}": ${adErr.message}`
      errors.push(msg)
      console.error(`[sync] ${msg}`)
    }
    if (!ad?.id) continue

    // Upsert enrichments (funnel stage)
    if (r.funnelStage) {
      const validStages = ['See', 'Think', 'Do', 'Care']
      const stage = validStages.find(s => s.toLowerCase() === r.funnelStage?.toLowerCase())
      if (stage) {
        await admin.from('ad_enrichments').upsert(
          { ad_id: ad.id, funnel_stage: stage as 'See' | 'Think' | 'Do' | 'Care' },
          { onConflict: 'ad_id' }
        )
      }
    }

    // Upsert spend estimate
    if (r.spend != null || r.impressions != null || r.reach != null) {
      const weekStart = getWeekStart(isoDate)
      await admin.from('ad_spend_estimates').upsert(
        {
          ad_id:            ad.id,
          week_start:       weekStart,
          est_spend_eur:    r.spend,
          est_impressions:  r.impressions,
          est_reach:        r.reach,
        },
        { onConflict: 'ad_id,week_start' }
      )
    }

    inserted++
  }

  // Refresh weekly_metrics for affected weeks
  const affectedWeeks = [...new Set(
    rows.map(r => {
      const raw = mapRow(r, mapping).date
      const d = raw instanceof Date ? raw : new Date(String(raw))
      return getWeekStart(isNaN(d.getTime()) ? String(raw) : d.toISOString().slice(0, 10))
    })
  )]

  for (const week of affectedWeeks) {
    await admin.rpc('refresh_weekly_metrics', { ws_id: workspaceId, week })
  }

  // Update sync status
  await admin
    .from('snowflake_connections')
    .update({
      sync_status:    'idle',
      sync_error:     null,
      last_synced_at: new Date().toISOString(),
      last_sync_rows: inserted,
      updated_at:     new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)

  return NextResponse.json({ ok: true, fetched: rows.length, inserted, errors })
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}
