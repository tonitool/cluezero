import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/data/creatives
 *
 * Returns paginated ad creatives with thumbnails, metadata, and spend.
 *
 * Query params:
 *   workspaceId  — required
 *   connectionId — optional filter
 *   brand        — optional brand name filter
 *   platform     — optional platform filter
 *   funnel       — optional funnel stage filter
 *   active       — "true" | "false" | omit for all
 *   search       — text search on headline / body
 *   sort         — "newest" | "pi" | "spend" (default: newest)
 *   page         — page number, 1-indexed (default: 1)
 *   pageSize     — items per page (default: 48, max: 100)
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const workspaceId  = p.get('workspaceId')
  const connectionId = p.get('connectionId')
  const brandFilter  = p.get('brand')
  const platform     = p.get('platform')
  const funnel       = p.get('funnel')
  const activeParam  = p.get('active')
  const search       = p.get('search')
  const sort         = (p.get('sort') ?? 'newest') as 'newest' | 'pi' | 'spend'
  const page         = Math.max(1, parseInt(p.get('page') ?? '1', 10))
  const pageSize     = Math.min(100, Math.max(1, parseInt(p.get('pageSize') ?? '48', 10)))

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: membership } = await admin
    .from('workspace_members').select('id')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── Build ads query ──────────────────────────────────────────────────────────
  let q = admin
    .from('ads')
    .select(`
      id, ad_id, headline, body, cta, creative_type,
      thumbnail_url, cdn_thumbnail_url,
      platform, performance_index, topic,
      first_seen_at, last_seen_at, is_active,
      tracked_brands ( id, name, color ),
      ad_enrichments ( funnel_stage, sentiment_score, topics ),
      ad_spend_estimates ( est_spend_eur, est_impressions, est_reach, week_start )
    `, { count: 'exact' })
    .eq('workspace_id', workspaceId)

  if (connectionId) q = q.eq('connection_id', connectionId)
  if (activeParam === 'true')  q = q.eq('is_active', true)
  if (activeParam === 'false') q = q.eq('is_active', false)
  if (search) q = q.or(`headline.ilike.%${search}%,body.ilike.%${search}%`)

  // Sort before pagination
  if (sort === 'pi')    q = q.order('performance_index', { ascending: false, nullsFirst: false })
  else                  q = q.order('first_seen_at', { ascending: false })

  // Pagination
  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data: rows, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Shape data ───────────────────────────────────────────────────────────────
  type RawRow = typeof rows extends (infer T)[] | null ? T : never

  const creatives = (rows ?? []).map((row: RawRow) => {
    const brand = Array.isArray(row.tracked_brands) ? row.tracked_brands[0] : row.tracked_brands
    const enrichment = Array.isArray(row.ad_enrichments) ? row.ad_enrichments[0] : row.ad_enrichments
    const spends = (Array.isArray(row.ad_spend_estimates) ? row.ad_spend_estimates : row.ad_spend_estimates ? [row.ad_spend_estimates] : []) as Array<{ est_spend_eur: number | null; est_impressions: number | null; est_reach: number | null; week_start: string }>
    const latestSpend = spends.sort((a, b) => b.week_start > a.week_start ? 1 : -1)[0]

    return {
      id:               row.id,
      adId:             row.ad_id,
      headline:         row.headline,
      body:             row.body,
      cta:              row.cta,
      creativeType:     row.creative_type,
      thumbnailUrl:     row.cdn_thumbnail_url ?? row.thumbnail_url ?? null,
      rawThumbnailUrl:  row.thumbnail_url ?? null,
      cdnThumbnailUrl:  row.cdn_thumbnail_url ?? null,
      platform:         row.platform,
      performanceIndex: row.performance_index != null ? Number(row.performance_index) : null,
      topic:            row.topic,
      firstSeenAt:      row.first_seen_at,
      lastSeenAt:       row.last_seen_at,
      isActive:         row.is_active,
      brand: {
        id:    (brand as { id?: string } | null)?.id ?? null,
        name:  (brand as { name?: string } | null)?.name ?? 'Unknown',
        color: (brand as { color?: string } | null)?.color ?? null,
      },
      funnelStage:    (enrichment as { funnel_stage?: string } | null)?.funnel_stage ?? null,
      sentiment:      (enrichment as { sentiment_score?: number } | null)?.sentiment_score ?? null,
      topics:         (enrichment as { topics?: string[] } | null)?.topics ?? [],
      estSpend:       latestSpend?.est_spend_eur ?? null,
      estImpressions: latestSpend?.est_impressions ?? null,
      estReach:       latestSpend?.est_reach ?? null,
    }
  })

  // Post-filter by brand name / platform / funnel (easier than SQL joins)
  const filtered = creatives.filter(c => {
    if (brandFilter && c.brand.name !== brandFilter) return false
    if (platform   && c.platform !== platform.toLowerCase()) return false
    if (funnel     && c.funnelStage !== funnel) return false
    return true
  })

  return NextResponse.json({
    creatives: filtered,
    total:    count ?? 0,
    page,
    pageSize,
    pages:    Math.ceil((count ?? 0) / pageSize),
  })
}
