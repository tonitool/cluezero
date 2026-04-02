'use client'

import { useState, useEffect } from 'react'
import {
  Bar, BarChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { KpiCard } from '@/components/dashboard/_components/kpi-card'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { FUNNEL_COLORS } from '@/components/dashboard/_components/constants'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  Meta: '#1877F2',
  Google: '#34A853',
  LinkedIn: '#0A66C2',
}

function piColor(pi: number): string {
  if (pi > 70) return '#16a34a'
  if (pi > 50) return '#d97706'
  return '#dc2626'
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

interface Props { workspaceId?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PerfData = Record<string, any>

export function PerformanceView({ workspaceId }: Props) {
  const [data, setData] = useState<PerfData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/data/performance?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => { if (d.hasData) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (loading) return (
    <div>
      <SectionHeader title="Campaign Performance" description="Funnel stage investment and top performing creative benchmarks" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="h-72 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
    </div>
  )

  const funnelDistribution  = data?.funnelDistribution  ?? []
  const funnelByAdvertiser  = data?.funnelByAdvertiser  ?? []
  const newAdsByFunnel      = data?.newAdsByFunnel      ?? []
  const creativeScorecards  = data?.creativeScorecards  ?? []
  const topCreatives        = data?.topCreatives        ?? []

  return (
    <div>
      <SectionHeader
        title="Campaign Performance"
        description="Funnel stage investment and top performing creative benchmarks"
      />

      {!data && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          No data yet — connect Snowflake and run a sync to populate this view.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Funnel Stage Distribution" height={280}>
          {funnelDistribution.length === 0 ? <EmptyState label="No funnel data" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 52 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={48} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelDistribution.map((entry: { stage: string }) => (
                    <Cell key={`cell-${entry.stage}`} fill={FUNNEL_COLORS[entry.stage as keyof typeof FUNNEL_COLORS] ?? '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Funnel Mix by Advertiser" height={280}>
          {funnelByAdvertiser.length === 0 ? <EmptyState label="No funnel data" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelByAdvertiser} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 64 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="advertiser" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="see" name="See" stackId="a" fill={FUNNEL_COLORS.See} />
                <Bar dataKey="think" name="Think" stackId="a" fill={FUNNEL_COLORS.Think} />
                <Bar dataKey="doo" name="Do" stackId="a" fill={FUNNEL_COLORS.Do} />
                <Bar dataKey="care" name="Care" stackId="a" fill={FUNNEL_COLORS.Care} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="New Ads by Funnel Stage Over Time" height={260} className="mt-4">
        {newAdsByFunnel.length === 0 ? <EmptyState label="No funnel data" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={newAdsByFunnel} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="see" name="See" stroke={FUNNEL_COLORS.See} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="think" name="Think" stroke={FUNNEL_COLORS.Think} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="doo" name="Do" stroke={FUNNEL_COLORS.Do} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="care" name="Care" stroke={FUNNEL_COLORS.Care} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <SubSection label="Creative Benchmark" />

      {creativeScorecards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {creativeScorecards.map((card: { label: string; value: string; delta: string }) => (
            <KpiCard key={card.label} label={card.label} value={card.value} delta={card.delta} direction="up" />
          ))}
        </div>
      )}

      <p className="text-sm font-semibold mb-4">Top 10 New Creatives This Week</p>

      {topCreatives.length === 0 ? (
        <p className="text-xs text-muted-foreground">No creative data available.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {topCreatives.map((creative: { id: string; platform: string; performanceIndex: number; title: string; brand: string; funnelStage: string; sentiment: number; thumbnail?: string }) => {
            const platformColor = PLATFORM_BADGE_COLORS[creative.platform] ?? '#888'
            const sentimentPct = ((creative.sentiment + 1) / 2) * 100
            const brandInitial = creative.brand.charAt(0).toUpperCase()

            return (
              <div key={creative.id} className="bg-white rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {creative.thumbnail ? (
                    <img
                      src={creative.thumbnail}
                      alt={creative.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = `<span class="text-2xl font-bold text-muted-foreground select-none">${brandInitial}</span>`
                        }
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground select-none">{brandInitial}</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border font-medium" style={{ borderColor: platformColor, color: platformColor }}>
                      {creative.platform}
                    </Badge>
                    <span className="text-sm font-bold tabular-nums" style={{ color: piColor(creative.performanceIndex) }}>
                      {creative.performanceIndex}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium mt-1 leading-snug">{creative.title}</p>
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <span className="text-[10px] text-muted-foreground truncate">{creative.brand}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{creative.funnelStage}</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground">Sentiment</p>
                    <Progress value={sentimentPct} className="h-1.5 mt-0.5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
