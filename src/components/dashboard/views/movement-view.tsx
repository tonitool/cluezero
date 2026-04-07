'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@/components/dashboard/_components/kpi-card'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { ChartTooltip, TICK, GRID, GRID_H, ACTIVE_DOT, fmtPercent } from '@/components/dashboard/_components/chart-theme'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function EmptyState({ label }: { label: string }) {
  return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{label}</div>
}

interface MovementData {
  hasData: boolean
  kpis: { totalWeeklySpend: number; totalWeeklyReach: number }
  weeklySpendMovement: Record<string, unknown>[]
  newAdsTrend: Record<string, unknown>[]
  newVsExisting: { advertiser: string; newAdsPct: number; existingAdsPct: number }[]
  table: { advertiser: string; platform: string; totalAds: number; newAds: number; weeklyReach: number; weeklySpend: number; avgPi: number | null }[]
  performanceTrend: { week: string; orlen: number | null; market: number | null }[]
}

interface Props {
  workspaceId?: string
  connectionId?: string
}

export function MovementView({ workspaceId, connectionId }: Props) {
  const [data, setData] = useState<MovementData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)
  // Re-render when brand colors change in Setup
  const [, setColorTick] = useState(0)
  useEffect(() => {
    const h = () => setColorTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, h)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, h)
  }, [])

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    const src = connectionId ? `&connectionId=${connectionId}` : ''
    fetch(`/api/data/movement?workspaceId=${workspaceId}${src}`)
      .then(r => r.json())
      .then((d: MovementData) => {
        if (d.hasData) setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId, connectionId])

  if (loading) return (
    <div>
      <SectionHeader title="Weekly Movement" description="New vs existing ads, platform momentum, and performance index trends" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        {[1,2].map(i => <div key={i} className="h-72 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
    </div>
  )

  const newVsExisting   = data?.newVsExisting   ?? []
  const newAdsTrendData = data?.newAdsTrend      ?? []
  const tableData       = data?.table            ?? []
  const performanceTrend = data?.performanceTrend ?? []

  const brandKeys = newAdsTrendData.length > 0
    ? Object.keys(newAdsTrendData[0]).filter(k => k !== 'week')
    : []

  const kpiMetrics = data?.kpis
    ? [
        {
          label: 'Total market weekly est. reach',
          value: data.kpis.totalWeeklyReach.toLocaleString(),
          subtitle: 'unique profiles',
          delta: '',
          direction: 'up' as const,
        },
        {
          label: 'Total market weekly est. spend',
          value: `€${data.kpis.totalWeeklySpend.toLocaleString()}`,
          subtitle: 'across active advertisers',
          delta: '',
          direction: 'up' as const,
        },
      ]
    : []

  return (
    <div>
      <SectionHeader
        title="Weekly Movement"
        description="New vs existing ads, platform momentum, and performance index trends"
      />

      {!data && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          No data yet — connect Snowflake and run a sync to populate this view.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiMetrics.map((metric) => (
          <KpiCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            subtitle={metric.subtitle}
            delta={metric.delta}
            direction={metric.direction}
          />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <ChartCard title="New vs Existing Ads" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            {newVsExisting.length === 0 ? <EmptyState label="No data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={newVsExisting} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid {...GRID_H} />
                  <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={64} />
                  <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtPercent} />} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="newAdsPct" name="New" stackId="a" fill="#6366F1" />
                  <Bar dataKey="existingAdsPct" name="Existing" stackId="a" fill="#E2E8F0" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="New Ads Trend" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            {newAdsTrendData.length === 0 ? <EmptyState label="No data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newAdsTrendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} />
                  <Tooltip content={(p) => <ChartTooltip {...p} />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {brandKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key.charAt(0).toUpperCase() + key.slice(1)}
                      stroke={getBrandColor(key, i)}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={ACTIVE_DOT}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Performance Index Trend" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            {performanceTrend.length === 0 ? <EmptyState label="No PI data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={(p) => <ChartTooltip {...p} />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="orlen" name="Brand" stroke={getBrandColor('orlen', 0)} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                  <Line type="monotone" dataKey="market" name="Market avg." stroke="#94A3B8" strokeWidth={2} dot={false} strokeDasharray="4 3" activeDot={ACTIVE_DOT} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5 transition-shadow hover:shadow-md">
          <p className="text-sm font-semibold leading-tight mb-4">Weekly Movement Details</p>
          {tableData.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Advertiser</TableHead>
                  <TableHead className="text-xs">Platform</TableHead>
                  <TableHead className="text-xs text-right">Total Ads</TableHead>
                  <TableHead className="text-xs text-right">New Ads</TableHead>
                  <TableHead className="text-xs text-right">Est. Spend</TableHead>
                  <TableHead className="text-xs text-right">PI Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={`${row.advertiser}-${row.platform}`}>
                    <TableCell className="text-xs font-medium">{row.advertiser}</TableCell>
                    <TableCell className="text-xs">{row.platform}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.totalAds}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.newAds}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">€{row.weeklySpend.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.avgPi ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
