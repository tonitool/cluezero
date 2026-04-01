import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimateSpend } from '@/lib/spend-estimator'

// This endpoint is called by the daily cron job (or manually via Refresh button).
// It fetches ads from the Meta Ad Library API for all tracked brands in a workspace.
// Trigger: GET /api/ads/ingest?workspaceId=xxx
//
// For production, secure this with a cron secret header:
//   Authorization: Bearer <CRON_SECRET>

const META_API_BASE = 'https://graph.facebook.com/v21.0/ads_archive'

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch all Meta-tracked brands for this workspace
  const { data: brands, error: brandsError } = await supabase
    .from('tracked_brands')
    .select('id, name, platform_page_id')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'meta')
    .not('platform_page_id', 'is', null)

  if (brandsError || !brands?.length) {
    return NextResponse.json({ message: 'No Meta brands configured' })
  }

  const results = []

  for (const brand of brands) {
    try {
      const params = new URLSearchParams({
        search_page_ids: brand.platform_page_id!,
        ad_reached_countries: JSON.stringify(['PL']),
        fields: [
          'id',
          'ad_creative_bodies',
          'ad_creative_link_titles',
          'ad_creative_link_captions',
          'ad_delivery_start_time',
          'ad_delivery_stop_time',
          'impressions',
          'spend',
          'publisher_platforms',
          'ad_snapshot_url',
        ].join(','),
        limit: '100',
        access_token: process.env.META_ADS_ACCESS_TOKEN!,
      })

      const res = await fetch(`${META_API_BASE}?${params}`)
      if (!res.ok) {
        results.push({ brand: brand.name, error: `Meta API ${res.status}` })
        continue
      }

      const json = await res.json() as { data: MetaAd[] }
      const ads = json.data ?? []

      let inserted = 0

      for (const ad of ads) {
        const headline = ad.ad_creative_link_titles?.[0] ?? null
        const body = ad.ad_creative_bodies?.[0] ?? null
        const thumbnailUrl = ad.ad_snapshot_url ?? null

        // Upsert the raw ad
        const { data: savedAd } = await supabase
          .from('ads')
          .upsert({
            workspace_id: workspaceId,
            brand_id: brand.id,
            platform: 'meta',
            ad_id: ad.id,
            creative_type: 'image',
            headline,
            body,
            thumbnail_url: thumbnailUrl,
            first_seen_at: ad.ad_delivery_start_time ?? new Date().toISOString(),
            last_seen_at: ad.ad_delivery_stop_time ?? null,
            is_active: !ad.ad_delivery_stop_time,
            raw_payload: ad as unknown as Record<string, unknown>,
          }, { onConflict: 'workspace_id,platform,ad_id' })
          .select('id')
          .single()

        if (savedAd) {
          // Save spend estimate
          const estimate = estimateSpend({
            platform: 'meta',
            creative_type: 'image',
            impressions_raw: ad.impressions ?? null,
          })

          const weekStart = getWeekStart(new Date())

          await supabase.from('ad_spend_estimates').upsert({
            ad_id: savedAd.id,
            week_start: weekStart,
            ...estimate,
          }, { onConflict: 'ad_id,week_start' })

          inserted++
        }
      }

      results.push({ brand: brand.name, ads_processed: ads.length, inserted })
    } catch (err) {
      results.push({ brand: brand.name, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, results })
}

// Get the ISO Monday of the current week as YYYY-MM-DD
function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

interface MetaAd {
  id: string
  ad_creative_bodies?: string[]
  ad_creative_link_titles?: string[]
  ad_creative_link_captions?: string[]
  ad_delivery_start_time?: string
  ad_delivery_stop_time?: string
  impressions?: string | { lower_bound: number; upper_bound: number }
  spend?: { lower_bound: number; upper_bound: number }
  publisher_platforms?: string[]
  ad_snapshot_url?: string
}
