// POST /api/data/explore
// Returns chart-ready data for the Explorer and Dashboard tiles.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

function toArr<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function weekStart(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().slice(0, 10)
}

function lastNWeekStarts(n: number, anchor?: string): string[] {
  const out: string[] = []
  const base = anchor ? new Date(anchor) : new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() - i * 7)
    out.push(weekStart(d.toISOString()))
  }
  return out
}

function computeMetric(metric: string, ads: Row[], validWeeks: Set<string>): number {
  switch (metric) {
    case 'spend':
      return Math.round(
        ads.reduce((s, ad) =>
          s + toArr(ad.ad_spend_estimates)
            .filter((e: Row) => validWeeks.has(String(e.week_start)))
            .reduce((ss: number, e: Row) => ss + Number(e.est_spend_eur ?? 0), 0),
          0)
      )
    case 'reach':
      return Math.round(
        ads.reduce((s, ad) =>
          s + toArr(ad.ad_spend_estimates)
            .filter((e: Row) => validWeeks.has(String(e.week_start)))
            .reduce((ss: number, e: Row) => ss + Number(e.est_reach ?? 0), 0),
          0)
      )
    case 'impressions':
      return Math.round(
        ads.reduce((s, ad) =>
          s + toArr(ad.ad_spend_estimates)
            .filter((e: Row) => validWeeks.has(String(e.week_start)))
            .reduce((ss: number, e: Row) => ss + Number(e.est_impressions ?? 0), 0),
          0)
      )
    case 'pi': {
      const scores = ads.flatMap(ad => ad.performance_index != null ? [Number(ad.performance_index)] : [])
      return scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0
    }
    case 'ad_count':
      return ads.length
    case 'new_ads':
      return ads.filter(ad => {
        if (!ad.first_seen_at) return false
        return validWeeks.has(weekStart(ad.first_seen_at))
      }).length
    default:
      return 0
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    workspaceId:  string
    metricA:      string
    metricB?:     string
    dimension:    string
    weekRange?:   number
    connectionId?: string
    filters?:     { brands?: string[]; platforms?: string[] }
  }

  const { workspaceId, metricA, metricB, dimension, weekRange = 4, connectionId, filters } = body
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Membership check
  const { data: membership } = await admin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch ads + related data
  // Note: topic is a direct column on ads (not ad_enrichments)
  //       est_reach / est_impressions live in ad_spend_estimates
  let q = admin
    .from('ads')
    .select(`
      id,
      first_seen_at,
      performance_index,
      platform,
      is_active,
      topic,
      tracked_brands ( name, is_own_brand ),
      ad_spend_estimates ( week_start, est_spend_eur, est_reach, est_impressions ),
      ad_enrichments ( funnel_stage )
    `)
    .eq('workspace_id', workspaceId)

  if (connectionId) q = q.eq('connection_id', connectionId)
  q = q.limit(50000)

  const { data: rows, error } = await q
  if (error) {
    console.error('[explore] query error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ads = (rows ?? []) as Row[]

  if (!ads.length) return NextResponse.json({ data: [] })

  // Anchor the week window to the latest date in the actual data
  // (avoids returning nothing when data is from 2024 but clock is 2026)
  let latestWeek: string | undefined
  for (const ad of ads) {
    for (const e of toArr(ad.ad_spend_estimates)) {
      const ws = String(e.week_start)
      if (!latestWeek || ws > latestWeek) latestWeek = ws
    }
    // Also consider first_seen_at
    if (ad.first_seen_at) {
      const ws = weekStart(ad.first_seen_at)
      if (!latestWeek || ws > latestWeek) latestWeek = ws
    }
  }

  const validWeeks = new Set(lastNWeekStarts(weekRange, latestWeek))

  // Apply optional brand/platform filters
  let filtered = ads
  if (filters?.brands?.length) {
    filtered = filtered.filter(ad => filters.brands!.includes(ad.tracked_brands?.name ?? ''))
  }
  if (filters?.platforms?.length) {
    filtered = filtered.filter(ad => filters.platforms!.includes(ad.platform ?? ''))
  }

  // ── Group by dimension ──────────────────────────────────────────────────

  const groups: Record<string, Row[]> = {}

  for (const ad of filtered) {
    let keys: string[] = []

    if (dimension === 'brand') {
      keys = [ad.tracked_brands?.name ?? 'Unknown']
    } else if (dimension === 'platform') {
      keys = [ad.platform ?? 'Unknown']
    } else if (dimension === 'week') {
      const weeks = toArr(ad.ad_spend_estimates)
        .map((e: Row) => String(e.week_start))
        .filter((w: string) => validWeeks.has(w))
      keys = weeks.length ? weeks : []
    } else if (dimension === 'funnel') {
      // funnel_stage is on ad_enrichments (one-to-one)
      const stage = toArr(ad.ad_enrichments)[0]?.funnel_stage
      keys = stage ? [stage] : ['Unknown']
    } else if (dimension === 'topic') {
      // topic is a direct text column on ads
      keys = ad.topic ? [ad.topic] : ['Other']
    }

    for (const key of keys) {
      if (!groups[key]) groups[key] = []
      groups[key].push(ad)
    }
  }

  // ── Compute metrics per group ────────────────────────────────────────────

  const data = Object.entries(groups)
    .map(([name, groupAds]) => {
      const weekSet = dimension === 'week' ? new Set([name]) : validWeeks
      const mA = computeMetric(metricA, groupAds, weekSet)
      const mB = metricB ? computeMetric(metricB, groupAds, weekSet) : undefined
      return { name, metricA: mA, ...(mB !== undefined ? { metricB: mB } : {}) }
    })
    .filter(d => {
      // Always show groups for count-based metrics, even if 0
      if (['ad_count', 'new_ads'].includes(metricA)) return true
      return d.metricA > 0 || (d.metricB !== undefined && d.metricB > 0)
    })
    .sort((a, b) => {
      if (dimension === 'week') return a.name < b.name ? -1 : 1
      return b.metricA - a.metricA
    })
    .slice(0, 20)

  return NextResponse.json({ data })
}
