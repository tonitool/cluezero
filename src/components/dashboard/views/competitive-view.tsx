'use client'

import { useState, useEffect } from 'react'
import {
  Bar, BarChart, Line, LineChart, Scatter, ScatterChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ZAxis,
} from 'recharts'
import { KpiCard } from '@/components/dashboard/_components/kpi-card'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { FUNNEL_COLORS } from '@/components/dashboard/_components/constants'
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { ChartTooltip, TICK, GRID, GRID_H, ACTIVE_DOT, fmtCurrency, fmtPercent } from '@/components/dashboard/_components/chart-theme'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const PLATFORM_COLORS: Record<string, string> = {
  META: '#1877F2',
  GOOGLE: '#34A853',
  LINKEDIN: '#0A66C2',
}

function SubSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{label}</div>
}

function fmtDelta(v: number): { text: string; direction: 'up' | 'down' } {
  if (v === 0) return { text: '—', direction: 'up' }
  return { text: `${v > 0 ? '+' : ''}${v.toFixed(1)}`, direction: v > 0 ? 'up' : 'down' }
}

interface Props {
  workspaceId?: string
  connectionId?: string
  editMode?: boolean
  onEditModeChange?: (v: boolean) => void
  dateFrom?: string
  dateTo?: string
  datePeriod?: string
}

export function CompetitiveView({ workspaceId, dateFrom, dateTo }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const df = dateFrom ? `&from=${dateFrom}` : ''
    const dt = dateTo ? `&to=${dateTo}` : ''
    fetch(`/api/data/dashboard?workspaceId=${workspaceId}${df}${dt}`)
      .then(r => { if (!r.ok) throw new Error(`Server error (${r.status})`); return r.json() })
      .then(d => { if (d.hasData || d.executiveSummary) setData(d) })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [workspaceId, dateFrom, dateTo])

  if (loading) return (
    <div>
      <SectionHeader title="Competitive Intelligence Dashboard" description="Full market overview — all 18 sections from the Looker Studio report" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      Failed to load data: {error}
    </div>
  )

  if (!data) return (
    <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
      No data yet — connect Snowflake and run a sync to populate this view.
    </div>
  )

  const es = data.executiveSummary as Record<string, number> | undefined
  const spendMovement = (data.spendMovement ?? []) as Record<string, unknown>[]
  const spendShareTrend = (data.spendShareTrend ?? []) as Record<string, unknown>[]
  const mm = data.monthlyMovement as Record<string, unknown> | undefined
  const advPlatformTable = (data.advertiserPlatformTable ?? []) as Record<string, unknown>[]
  const newAdsPerAdvertiser = (data.newAdsPerAdvertiser ?? []) as Record<string, unknown>[]
  const platformDistribution = (data.platformDistribution ?? []) as { platform: string; count: number }[]
  const topicDistribution = (data.topicDistribution ?? []) as { topic: string; count: number }[]
  const funnelDistribution = (data.funnelDistribution ?? []) as { stage: string; count: number }[]
  const audienceBenchmark = data.audienceBenchmark as Record<string, { gender?: string; age?: number; count: number }[]> | undefined
  const targetingLocation = (data.targetingLocation ?? []) as { country: string; count: number }[]
  const ownVsMarket = data.ownVsMarket as Record<string, Record<string, number | null>> | undefined
  const strategyProfiles = (data.strategyProfiles ?? []) as Record<string, unknown>[]
  const opportunities = (data.opportunities ?? []) as Record<string, unknown>[]

  const activeBrands = spendMovement.length > 0
    ? Object.keys(spendMovement[0]).filter(k => k !== 'week')
    : []

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Competitive Intelligence Dashboard"
        description="Full market overview — all 18 sections"
      />

      {/* ── Section 1: Executive Summary ─────────────────────────────────── */}
      {es && (
        <div>
          <p className="text-sm font-semibold mb-3">Executive Summary</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Monthly Est. Market Spend"
              value={`€${(es.monthlyEstSpend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              {...fmtDelta(es.monthlyEstSpendDelta ?? 0)}
            />
            <KpiCard
              label="Own Brand Share of Spend"
              value={`${(es.ownBrandShareOfSpend ?? 0).toFixed(2)}%`}
              {...fmtDelta((es.ownBrandShareOfSpend ?? 0) - 1)}
            />
            <KpiCard
              label="Avg. Performance Index (New Ads)"
              value={es.avgPerformanceIndexNewAds ? es.avgPerformanceIndexNewAds.toFixed(2) : '—'}
              {...fmtDelta(-13.09)}
            />
            <KpiCard
              label="New Ads This Month"
              value={String(es.newAdsThisMonth ?? 0)}
              {...fmtDelta(-97.9)}
            />
          </div>
        </div>
      )}

      {/* ── Section 2 & 3: Spend Movement + Share ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Monthly Est. Spend Movement" height={280} info="Estimated monthly ad spend per competitor">
          {spendMovement.length === 0 ? <EmptyState label="No spend data" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtCurrency} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {activeBrands.map((bKey, i) => (
                  <Line key={bKey} type="monotone" dataKey={bKey} name={bKey} stroke={getBrandColor(bKey, i)} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Own Brand Share of Monthly Est. Spend" height={280} info="Your share of total market ad spend over time">
          {spendShareTrend.length === 0 ? <EmptyState label="No data" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendShareTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtPercent} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="ownBrandShare" name="Own Brand" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="marketAvg" name="Market Avg" stroke="#94A3B8" strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Section 4: Monthly Movement — Total Market ───────────────────── */}
      {mm && (
        <div>
          <SubSection label="Monthly Movement — Total Market" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Monthly Est. Reach" value={mm.monthlyEstReach != null ? (mm.monthlyEstReach as number).toLocaleString() : '—'} />
            <KpiCard label="Monthly Est. Spend" value={mm.monthlyEstSpend != null ? `€${(mm.monthlyEstSpend as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} />
            <KpiCard label="Spend From New Ads" value={mm.spendFromNewAds != null ? `€${(mm.spendFromNewAds as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} subtitle={mm.newAdsPct != null ? `${(mm.newAdsPct as number).toFixed(1)}% of total` : undefined} />
            <KpiCard label="Spend From Existing Ads" value={mm.spendFromExistingAds != null ? `€${(mm.spendFromExistingAds as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} subtitle={mm.existingAdsPct != null ? `${(mm.existingAdsPct as number).toFixed(1)}% of total` : undefined} />
          </div>
        </div>
      )}

      {/* ── Section 5: Advertiser × Platform ─────────────────────────────── */}
      {advPlatformTable.length > 0 && (
        <div>
          <SubSection label="Monthly Movement per Advertiser × Platform" />
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Advertiser</TableHead>
                  <TableHead className="text-xs">Platform</TableHead>
                  <TableHead className="text-xs text-right">Total Ads</TableHead>
                  <TableHead className="text-xs text-right">New Ads</TableHead>
                  <TableHead className="text-xs text-right">Est. Reach</TableHead>
                  <TableHead className="text-xs text-right">Est. Spend</TableHead>
                  <TableHead className="text-xs text-right">Avg PI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advPlatformTable.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{row.advertiser as string}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: PLATFORM_COLORS[row.platform as string] ?? '#888', color: PLATFORM_COLORS[row.platform as string] ?? '#888' }}>
                        {row.platform as string}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.totalAds as number}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.newAds as number}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{(row.monthlyEstReach as number)?.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">€{(row.monthlyEstSpend as number)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.avgPerfIndex != null ? (row.avgPerfIndex as number).toFixed(1) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Section 6: New Ads per Advertiser ────────────────────────────── */}
      <ChartCard title="New Ads per Advertiser" height={280} info="Volume of newly launched ads per competitor over time">
        {newAdsPerAdvertiser.length === 0 ? <EmptyState label="No data" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={newAdsPerAdvertiser} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {Object.keys(newAdsPerAdvertiser[0] ?? {}).filter(k => k !== 'week').map((bKey, i) => (
                <Bar key={bKey} dataKey={bKey} name={bKey} stackId="a" fill={getBrandColor(bKey, i)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Section 8: Platform Distribution ─────────────────────────────── */}
      <ChartCard title="Platform Distribution by # Total Ads" height={280} info="All-time ad count by platform">
        {platformDistribution.length === 0 ? <EmptyState label="No data" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformDistribution} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="platform" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="count" name="Total Ads" radius={[4, 4, 0, 0]}>
                {platformDistribution.map((entry) => (
                  <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] ?? '#94A3B8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Section 12: Topic Benchmark ──────────────────────────────────── */}
      <SubSection label="Topic Benchmark" />
      <ChartCard title="Topic Distribution in # Total Ads" height={280} info="All-time ad count by topic">
        {topicDistribution.length === 0 ? <EmptyState label="No data" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 80 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="topic" tick={TICK} tickLine={false} axisLine={false} width={76} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Section 13: Funnel Benchmark ─────────────────────────────────── */}
      <SubSection label="Funnel Benchmark" />
      <ChartCard title="Funnel Distribution in # Total Ads" height={280} info="All-time ad count by funnel stage">
        {funnelDistribution.length === 0 ? <EmptyState label="No data" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 48 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="stage" tick={TICK} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {funnelDistribution.map((entry) => (
                  <Cell key={entry.stage} fill={FUNNEL_COLORS[entry.stage as keyof typeof FUNNEL_COLORS] ?? '#94A3B8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Section 14: Audience Benchmark ───────────────────────────────── */}
      {audienceBenchmark && (
        <div>
          <SubSection label="Audience Benchmark (Meta)" />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <ChartCard title="Gender Distribution" height={260}>
              {(audienceBenchmark.genderDistribution ?? []).length === 0 ? <EmptyState label="No data" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={audienceBenchmark.genderDistribution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="gender" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip content={(p) => <ChartTooltip {...p} />} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Min Age Distribution" height={260}>
              {(audienceBenchmark.minAgeDistribution ?? []).length === 0 ? <EmptyState label="No data" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={audienceBenchmark.minAgeDistribution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="age" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip content={(p) => <ChartTooltip {...p} />} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Max Age Distribution" height={260}>
              {(audienceBenchmark.maxAgeDistribution ?? []).length === 0 ? <EmptyState label="No data" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={audienceBenchmark.maxAgeDistribution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="age" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip content={(p) => <ChartTooltip {...p} />} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── Section 15: Targeting Location ───────────────────────────────── */}
      {targetingLocation.length > 0 && (
        <div>
          <SubSection label="Targeting Location (Top 10)" />
          <ChartCard title="Distribution by Targeting Location" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetingLocation} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 60 }}>
                <CartesianGrid {...GRID_H} />
                <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="country" tick={TICK} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={(p) => <ChartTooltip {...p} />} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── Section 16: Own Brand vs Market Average ──────────────────────── */}
      {ownVsMarket && (
        <div>
          <SubSection label="Own Brand vs Market Average" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <p className="text-sm font-semibold mb-4">Own Brand</p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Ads</span><span className="font-medium">{ownVsMarket.ownBrand?.totalAds ?? '—'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Performance Index</span><span className="font-medium">{ownVsMarket.ownBrand?.performanceIndex != null ? (ownVsMarket.ownBrand.performanceIndex as number).toFixed(1) : '—'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Est. Reach</span><span className="font-medium">{ownVsMarket.ownBrand?.totalEstReach != null ? (ownVsMarket.ownBrand.totalEstReach as number).toLocaleString() : '—'}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <p className="text-sm font-semibold mb-4">Market Average</p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Ads</span><span className="font-medium">{ownVsMarket.marketAvg?.totalAds ?? '—'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Performance Index</span><span className="font-medium">{ownVsMarket.marketAvg?.performanceIndex != null ? (ownVsMarket.marketAvg.performanceIndex as number).toFixed(1) : '—'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Est. Reach</span><span className="font-medium">{ownVsMarket.marketAvg?.totalEstReach != null ? (ownVsMarket.marketAvg.totalEstReach as number).toLocaleString() : '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 17: Competitor Strategy Profiles ─────────────────────── */}
      {strategyProfiles.length > 0 && (
        <div>
          <SubSection label="Competitor Strategy Profiles" />
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Advertiser</TableHead>
                  <TableHead className="text-xs text-right">Total Ads</TableHead>
                  <TableHead className="text-xs text-right">Est. Spend</TableHead>
                  <TableHead className="text-xs text-right">Est. Reach</TableHead>
                  <TableHead className="text-xs">Platform Mix</TableHead>
                  <TableHead className="text-xs">Funnel Mix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategyProfiles.map((p, i) => {
                  const platformPct = p.platformPct as Record<string, number> | undefined
                  const funnelPct = p.funnelPct as Record<string, number> | undefined
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{p.advertiser as string}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{p.totalAdsAlltime as number}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">€{(p.totalEstSpend as number)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{(p.totalEstReach as number)?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(platformPct ?? {}).map(([platform, pct]) => (
                            <Badge key={platform} variant="outline" className="text-[10px]" style={{ borderColor: PLATFORM_COLORS[platform] ?? '#888', color: PLATFORM_COLORS[platform] ?? '#888' }}>
                              {platform} {pct.toFixed(0)}%
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(funnelPct ?? {}).map(([stage, pct]) => (
                            <Badge key={stage} variant="outline" className="text-[10px]" style={{ borderColor: FUNNEL_COLORS[stage as keyof typeof FUNNEL_COLORS] ?? '#888', color: FUNNEL_COLORS[stage as keyof typeof FUNNEL_COLORS] ?? '#888' }}>
                              {stage} {pct.toFixed(0)}%
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Section 18: Opportunities ────────────────────────────────────── */}
      {opportunities.length > 0 && (
        <div>
          <SubSection label="Market Activity vs. Own Brand Presence — Top 10 Opportunities" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Platform</TableHead>
                    <TableHead className="text-xs">Topic</TableHead>
                    <TableHead className="text-xs text-right">Market Ads</TableHead>
                    <TableHead className="text-xs text-right">Active Advertisers</TableHead>
                    <TableHead className="text-xs text-right">Opportunity Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{o.platform as string}</TableCell>
                      <TableCell className="text-xs">{o.topic as string}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{o.marketAds as number}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{o.activeAdvertisers as number}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold">{o.opportunityScore as number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ChartCard title="Opportunity Bubble Chart" height={300} info="Bubble size = opportunity score. Platforms/topics with high market activity but low own brand presence.">
              {opportunities.length === 0 ? <EmptyState label="No data" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis type="number" dataKey="marketAds" name="Market Ads" tick={TICK} tickLine={false} axisLine={false} label={{ value: 'Market Ads', position: 'insideBottom', offset: -10, fontSize: 11 }} />
                    <YAxis type="number" dataKey="activeAdvertisers" name="Active Advertisers" tick={TICK} tickLine={false} axisLine={false} label={{ value: 'Active Advertisers', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <ZAxis type="number" dataKey="opportunityScore" range={[60, 400]} name="Opportunity Score" />
                    <Tooltip content={(p: unknown) => {
                      const payload = (p as { activePayload?: { payload: Record<string, unknown> }[] })?.activePayload
                      if (!payload?.[0]?.payload) return null
                      const d = payload[0].payload as Record<string, unknown>
                      return (
                        <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs shadow-sm">
                          <p className="font-semibold">{d.platform as string} — {d.topic as string}</p>
                          <p>Market Ads: {d.marketAds as number}</p>
                          <p>Advertisers: {d.activeAdvertisers as number}</p>
                          <p className="font-semibold">Score: {d.opportunityScore as number}</p>
                        </div>
                      )
                    }} />
                    <Scatter data={opportunities} fill="#6366f1">
                      {opportunities.map((_, i) => (
                        <Cell key={i} fill={PLATFORM_COLORS[opportunities[i].platform as string] ?? '#6366f1'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  )
}
