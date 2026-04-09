import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function brandKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]/g, '')
}

function topicKey(name: string): string {
  if (!name) return 'other'
  return name.toLowerCase().replace(/[\s\-\/\(\)]/g, '_').replace(/_+/g, '_').replace(/^_|_$/, '')
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

/**
 * An ad is "new" in the period containing `periodDate` if `first_seen_at`
 * falls in the same calendar month.  Snowflake date buckets are monthly
 * (DATE_TRUNC MONTH) so a 7-day window would wrongly classify the 2nd–4th
 * week of the first month as "existing".
 */
function isNewAd(firstSeenAt: string, periodDate: string): boolean {
  const first = new Date(firstSeenAt)
  const period = new Date(periodDate)
  return (
    first.getUTCFullYear() === period.getUTCFullYear() &&
    first.getUTCMonth()    === period.getUTCMonth()
  )
}

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
    .select(`id, first_seen_at, is_active, performance_index, topic, platform,
      tracked_brands ( name )`)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
  if (connectionId) adsQuery = adsQuery.eq('connection_id', connectionId)
  const { data: rows, error } = await adsQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ hasData: false })

  // Per-brand PI scores and topic counts
  const brandPiScores: Record<string, number[]> = {}
  const brandNames: Record<string, string> = {}
  const brandTopicCounts: Record<string, Record<string, number>> = {}
  const brandPlatformCounts: Record<string, Record<string, number>> = {}
  const topicTotalCounts: Record<string, number> = {}
  const topicNewByWeek: Record<string, Record<string, number>> = {} // week -> topicKey -> count
  const allWeeks = new Set<string>()

  for (const ad of rows) {
    const rawName = ((ad.tracked_brands as unknown) as { name: string } | null)?.name ?? 'Unknown'
    const bKey = brandKey(rawName)
    brandNames[bKey] = rawName

    // PI scores
    if (!brandPiScores[bKey]) brandPiScores[bKey] = []
    if (ad.performance_index != null) brandPiScores[bKey].push(Number(ad.performance_index))

    // Topic
    if (ad.topic) {
      const tKey = topicKey(String(ad.topic))
      if (!brandTopicCounts[bKey]) brandTopicCounts[bKey] = {}
      brandTopicCounts[bKey][tKey] = (brandTopicCounts[bKey][tKey] ?? 0) + 1
      topicTotalCounts[tKey] = (topicTotalCounts[tKey] ?? 0) + 1
    }

    // Platform
    const plat = String(ad.platform ?? 'meta').toLowerCase()
    if (!brandPlatformCounts[bKey]) brandPlatformCounts[bKey] = {}
    brandPlatformCounts[bKey][plat] = (brandPlatformCounts[bKey][plat] ?? 0) + 1

    // New ads by topic over weeks
    const week = getWeekStart(ad.first_seen_at)
    allWeeks.add(week)
    if (ad.topic && isNewAd(ad.first_seen_at, week)) {
      const tKey = topicKey(String(ad.topic))
      if (!topicNewByWeek[week]) topicNewByWeek[week] = {}
      topicNewByWeek[week][tKey] = (topicNewByWeek[week][tKey] ?? 0) + 1
    }
  }

  const sortedWeeks = [...allWeeks].sort()
  const brands = Object.keys(brandPiScores)

  // Performance index ranking
  const performanceIndexRanking = brands
    .map(b => {
      const pis = brandPiScores[b]
      const avg = pis.length > 0 ? Math.round(pis.reduce((s, v) => s + v, 0) / pis.length * 10) / 10 : 0
      return { advertiser: brandNames[b] ?? b, score: avg }
    })
    .sort((a, b) => b.score - a.score)

  // Topic distribution (top 8 topics)
  const topicDistribution = Object.entries(topicTotalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, totalAds]) => ({ topic: key.replace(/_/g, ' '), totalAds, _key: key }))

  const topTopicKeys = topicDistribution.map(t => t._key)

  // Topic by advertiser (% breakdown of top topics per brand)
  const topicByAdvertiser = brands.map(b => {
    const counts = brandTopicCounts[b] ?? {}
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    const row: Record<string, unknown> = { advertiser: brandNames[b] ?? b }
    for (const tKey of topTopicKeys) {
      row[tKey] = total > 0 ? Math.round(((counts[tKey] ?? 0) / total) * 100) : 0
    }
    return row
  })

  // New ads by topic over time
  const newAdsByTopic = sortedWeeks.map(week => {
    const row: Record<string, unknown> = { week: formatWeek(week) }
    for (const tKey of topTopicKeys) {
      row[tKey] = topicNewByWeek[week]?.[tKey] ?? 0
    }
    return row
  })

  // Platform distribution by advertiser
  const platformDistributionByAdvertiser = brands.map(b => {
    const counts = brandPlatformCounts[b] ?? {}
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    return {
      advertiser: brandNames[b] ?? b,
      meta: total > 0 ? Math.round(((counts['meta'] ?? 0) / total) * 100) : 0,
      google: total > 0 ? Math.round(((counts['google'] ?? 0) / total) * 100) : 0,
      linkedin: total > 0 ? Math.round(((counts['linkedin'] ?? 0) / total) * 100) : 0,
    }
  })

  // Platform strategy comparison: market avg vs orlen
  const allPlatCounts = brands.reduce((acc, b) => {
    const c = brandPlatformCounts[b] ?? {}
    acc.meta += c['meta'] ?? 0
    acc.google += c['google'] ?? 0
    acc.linkedin += c['linkedin'] ?? 0
    return acc
  }, { meta: 0, google: 0, linkedin: 0 })
  const allPlatTotal = allPlatCounts.meta + allPlatCounts.google + allPlatCounts.linkedin
  const orlenPlat = brandPlatformCounts['orlen'] ?? {}
  const orlenPlatTotal = Object.values(orlenPlat).reduce((s, v) => s + v, 0)

  const platformStrategyComparison = [
    {
      segment: 'Market avg.',
      meta: allPlatTotal > 0 ? Math.round((allPlatCounts.meta / allPlatTotal) * 100) : 0,
      google: allPlatTotal > 0 ? Math.round((allPlatCounts.google / allPlatTotal) * 100) : 0,
      linkedin: allPlatTotal > 0 ? Math.round((allPlatCounts.linkedin / allPlatTotal) * 100) : 0,
    },
    {
      segment: 'ORLEN',
      meta: orlenPlatTotal > 0 ? Math.round(((orlenPlat['meta'] ?? 0) / orlenPlatTotal) * 100) : 0,
      google: orlenPlatTotal > 0 ? Math.round(((orlenPlat['google'] ?? 0) / orlenPlatTotal) * 100) : 0,
      linkedin: orlenPlatTotal > 0 ? Math.round(((orlenPlat['linkedin'] ?? 0) / orlenPlatTotal) * 100) : 0,
    },
  ]

  return NextResponse.json({
    hasData: true,
    performanceIndexRanking,
    topicDistribution,
    topicByAdvertiser,
    newAdsByTopic,
    topTopicKeys,
    platformDistributionByAdvertiser,
    platformStrategyComparison,
    brands,
    brandNames,
  })
}
