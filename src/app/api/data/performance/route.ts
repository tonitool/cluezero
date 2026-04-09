import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function brandKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]/g, '')
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().slice(0, 10)
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function isNewAd(firstSeenAt: string, periodDate: string): boolean {
  const first = new Date(firstSeenAt)
  const period = new Date(periodDate)
  return (
    first.getUTCFullYear() === period.getUTCFullYear() &&
    first.getUTCMonth()    === period.getUTCMonth()
  )
}

const VALID_STAGES = ['See', 'Think', 'Do', 'Care'] as const
type FunnelStage = typeof VALID_STAGES[number]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const connectionId = searchParams.get('connectionId')
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

  let adsQuery = admin
    .from('ads')
    .select(`id, first_seen_at, is_active, performance_index, headline, platform,
      tracked_brands ( name ),
      ad_enrichments ( funnel_stage )`)
    .eq('workspace_id', workspaceId)
  if (connectionId) adsQuery = adsQuery.eq('connection_id', connectionId)
  adsQuery = adsQuery.limit(50000)
  const { data: rows, error } = await adsQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ hasData: false })

  const brandNames: Record<string, string> = {}
  // funnel stage counts: total and per brand
  const stageTotals: Record<FunnelStage, number> = { See: 0, Think: 0, Do: 0, Care: 0 }
  const brandStageCounts: Record<string, Record<FunnelStage, number>> = {}
  // new ads by funnel stage per week
  const stageNewByWeek: Record<string, Record<FunnelStage, number>> = {}
  const allWeeks = new Set<string>()
  // for creatives
  type AdRow = { id: string; headline: string | null; brand: string; platform: string; pi: number | null; funnelStage: FunnelStage | null; firstSeenAt: string }
  const adRows: AdRow[] = []
  const allPiScores: number[] = []
  const doStageCount = { total: 0, do: 0 }

  for (const ad of rows) {
    const rawName = ((ad.tracked_brands as unknown) as { name: string } | null)?.name ?? 'Unknown'
    const bKey = brandKey(rawName)
    brandNames[bKey] = rawName

    const enrichment = Array.isArray(ad.ad_enrichments) ? ad.ad_enrichments[0] : ad.ad_enrichments
    const rawStage = (enrichment as { funnel_stage?: string } | null)?.funnel_stage
    const stage = VALID_STAGES.find(s => s.toLowerCase() === (rawStage ?? '').toLowerCase()) ?? null

    const week = getWeekStart(ad.first_seen_at)
    allWeeks.add(week)

    if (stage) {
      stageTotals[stage]++
      if (!brandStageCounts[bKey]) brandStageCounts[bKey] = { See: 0, Think: 0, Do: 0, Care: 0 }
      brandStageCounts[bKey][stage]++

      if (isNewAd(ad.first_seen_at, week)) {
        if (!stageNewByWeek[week]) stageNewByWeek[week] = { See: 0, Think: 0, Do: 0, Care: 0 }
        stageNewByWeek[week][stage]++
      }
    }

    if (ad.performance_index != null) allPiScores.push(Number(ad.performance_index))
    doStageCount.total++
    if (stage === 'Do') doStageCount.do++

    adRows.push({ id: ad.id, headline: ad.headline, brand: rawName, platform: String(ad.platform ?? 'Meta'), pi: ad.performance_index != null ? Number(ad.performance_index) : null, funnelStage: stage, firstSeenAt: ad.first_seen_at })
  }

  const sortedWeeks = [...allWeeks].sort()
  const brands = Object.keys(brandStageCounts)
  const latestWeek = sortedWeeks[sortedWeeks.length - 1]

  // funnelDistribution
  const total = Object.values(stageTotals).reduce((s, v) => s + v, 0)
  const funnelDistribution = VALID_STAGES.map(s => ({ stage: s, value: total > 0 ? Math.round((stageTotals[s] / total) * 100) : 0 }))

  // funnelByAdvertiser (% per brand)
  const funnelByAdvertiser = brands.map(b => {
    const counts = brandStageCounts[b]
    const brandTotal = Object.values(counts).reduce((s, v) => s + v, 0)
    return {
      advertiser: brandNames[b] ?? b,
      see: brandTotal > 0 ? Math.round((counts.See / brandTotal) * 100) : 0,
      think: brandTotal > 0 ? Math.round((counts.Think / brandTotal) * 100) : 0,
      doo: brandTotal > 0 ? Math.round((counts.Do / brandTotal) * 100) : 0,
      care: brandTotal > 0 ? Math.round((counts.Care / brandTotal) * 100) : 0,
    }
  })

  // newAdsByFunnel over time
  const newAdsByFunnel = sortedWeeks.map(week => ({
    week: formatWeek(week),
    see: stageNewByWeek[week]?.See ?? 0,
    think: stageNewByWeek[week]?.Think ?? 0,
    doo: stageNewByWeek[week]?.Do ?? 0,
    care: stageNewByWeek[week]?.Care ?? 0,
  }))

  // creativeScorecards
  const avgPi = allPiScores.length > 0 ? Math.round(allPiScores.reduce((s, v) => s + v, 0) / allPiScores.length * 10) / 10 : 0
  const topPi = allPiScores.length > 0 ? Math.round(Math.max(...allPiScores) * 10) / 10 : 0
  // new ads in latest week with high PI (>= 70)
  const newHighPerformers = adRows.filter(r => isNewAd(r.firstSeenAt, latestWeek) && (r.pi ?? 0) >= 70).length
  const doStagePct = doStageCount.total > 0 ? `${Math.round((doStageCount.do / doStageCount.total) * 100)}%` : '0%'

  const creativeScorecards = [
    { label: 'Avg. creative score', value: String(avgPi), delta: '' },
    { label: 'Top creative score', value: String(topPi), delta: '' },
    { label: 'New high-performers', value: String(newHighPerformers), delta: '' },
    { label: 'Do-stage creative share', value: doStagePct, delta: '' },
  ]

  // topCreatives — top 10 ads by PI from latest week or fallback to all time
  const latestWeekAds = adRows.filter(r => isNewAd(r.firstSeenAt, latestWeek))
  const sourceForTop = latestWeekAds.length >= 5 ? latestWeekAds : adRows
  const topCreatives = sourceForTop
    .filter(r => r.pi != null)
    .sort((a, b) => (b.pi ?? 0) - (a.pi ?? 0))
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      brand: r.brand,
      title: r.headline ?? '(no headline)',
      platform: r.platform.charAt(0).toUpperCase() + r.platform.slice(1).toLowerCase() as 'Meta' | 'Google' | 'LinkedIn',
      performanceIndex: r.pi ?? 0,
      sentiment: 0,
      funnelStage: r.funnelStage ?? 'See',
      thumbnail: '',
    }))

  return NextResponse.json({ hasData: true, funnelDistribution, funnelByAdvertiser, newAdsByFunnel, creativeScorecards, topCreatives })
}
