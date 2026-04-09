import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function brandKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]/g, '')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const connectionId = searchParams.get('connectionId')
  const ownBrandParam = (searchParams.get('brand') ?? 'ORLEN').toLowerCase().replace(/[\s\-_]/g, '')
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
    .select(`id, is_active, performance_index,
      tracked_brands ( name ),
      ad_spend_estimates ( est_reach )`)
    .eq('workspace_id', workspaceId)
  if (connectionId) adsQuery = adsQuery.eq('connection_id', connectionId)
  const { data: rows, error } = await adsQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ hasData: false })

  // Aggregate per brand
  type BrandStats = { totalAds: number; piScores: number[]; reach: number }
  const byBrand: Record<string, BrandStats> = {}
  const brandNames: Record<string, string> = {}

  for (const ad of rows) {
    const rawName = ((ad.tracked_brands as unknown) as { name: string } | null)?.name ?? 'Unknown'
    const bKey = brandKey(rawName)
    brandNames[bKey] = rawName
    if (!byBrand[bKey]) byBrand[bKey] = { totalAds: 0, piScores: [], reach: 0 }
    byBrand[bKey].totalAds++
    if (ad.performance_index != null) byBrand[bKey].piScores.push(Number(ad.performance_index))
    const estimates = Array.isArray(ad.ad_spend_estimates) ? ad.ad_spend_estimates : []
    for (const e of estimates) {
      byBrand[bKey].reach += Number((e as { est_reach: number | null }).est_reach ?? 0)
    }
  }

  const brands = Object.keys(byBrand)
  function avgPi(bKey: string): number {
    const pis = byBrand[bKey]?.piScores ?? []
    return pis.length > 0 ? Math.round(pis.reduce((s, v) => s + v, 0) / pis.length * 10) / 10 : 0
  }
  function topPi(bKey: string): number {
    const pis = byBrand[bKey]?.piScores ?? []
    return pis.length > 0 ? Math.round(Math.max(...pis) * 10) / 10 : 0
  }

  // Find which stored brand key matches the user's own brand
  const ownKey = brands.find(b => b.includes(ownBrandParam) || ownBrandParam.includes(b)) ?? brands[0] ?? 'orlen'

  const competitors = brands.filter(b => b !== ownKey)
  const marketAvgAds = competitors.length > 0
    ? Math.round(competitors.reduce((s, b) => s + byBrand[b].totalAds, 0) / competitors.length)
    : 0
  const allBrandPis = brands.flatMap(b => byBrand[b].piScores)
  const marketAvgPi = allBrandPis.length > 0
    ? Math.round(allBrandPis.reduce((s, v) => s + v, 0) / allBrandPis.length * 10) / 10 : 0
  const competitorTopPis = competitors.map(b => topPi(b))
  const marketTopPi = competitorTopPis.length > 0 ? Math.round(Math.max(...competitorTopPis) * 10) / 10 : 0
  const marketAvgReach = competitors.length > 0
    ? Math.round(competitors.reduce((s, b) => s + byBrand[b].reach, 0) / competitors.length / 1000)
    : 0

  const ownStats = byBrand[ownKey] ?? { totalAds: 0, piScores: [], reach: 0 }

  const orlenVsMarketScorecards = [
    { label: 'Total ads', orlen: ownStats.totalAds, market: marketAvgAds },
    { label: 'Performance index', orlen: avgPi(ownKey), market: marketAvgPi },
    { label: 'Top creative score', orlen: topPi(ownKey), market: marketTopPi },
    { label: 'Total est. reach (k)', orlen: Math.round(ownStats.reach / 1000), market: marketAvgReach },
  ]

  // Market activity vs presence scatter (activity = avg PI, presence = unique week count, reach = total reach/1000)
  const marketActivityVsPresence = brands.map(b => ({
    advertiser: brandNames[b] ?? b,
    activity: avgPi(b),
    presence: byBrand[b].totalAds,
    reach: Math.round(byBrand[b].reach / 1000),
  }))

  return NextResponse.json({ hasData: true, orlenVsMarketScorecards, marketActivityVsPresence, brands, brandNames })
}
