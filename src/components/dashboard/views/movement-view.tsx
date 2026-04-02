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
import { BRAND_COLORS } from '@/components/dashboard/_components/constants'
import {
  weeklyMovementMetrics,
  newVsExistingByAdvertiser,
  newAdsTrend as mockNewAdsTrend,
  performanceTrend,
  weeklyMovementTable as mockTable,
} from '@/components/dashboard/mock-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface MovementData {
  hasData: boolean
  kpis: { totalWeeklySpend: number; totalWeeklyReach: number }
  weeklySpendMovement: Record<string, unknown>[]
  newAdsTrend: Record<string, unknown>[]
  newVsExisting: { advertiser: string; newAdsPct: number; existingAdsPct: number }[]
  table: { advertiser: string; platform: string; totalAds: number; newAds: number; weeklyReach: number; weeklySpend: number; avgPi: number | null }[]
}

interface Props {
  workspaceId?: string
}

export function MovementView({ workspaceId }: Props) {
  const [data, setData] = useState<MovementData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/data/movement?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then((d: MovementData) => {
        if (d.hasData) setData(d)
      })
      .catch(() => {/* fall through to mock */})
      .finally(() => setLoading(false))
  }, [workspaceId])

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

  // Use real data if available, otherwise fall back to mock
  const newVsExisting   = data?.newVsExisting   ?? newVsExistingByAdvertiser
  const newAdsTrendData = data?.newAdsTrend      ?? mockNewAdsTrend
  const tableData       = data?.table            ?? mockTable

  // Derive brand keys from real data for dynamic chart lines
  const brandKeys = newAdsTrendData.length > 0
    ? Object.keys(newAdsTrendData[0]).filter(k => k !== 'week')
    : ['orlen', 'aral', 'eni', 'esso', 'shell']

  // KPI metrics — use real if available, otherwise mock
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
    : weeklyMovementMetrics

  return (
    <div>
      <SectionHeader
        title="Weekly Movement"
        description="New vs existing ads, platform momentum, and performance index trends"
      />

      {data?.hasData && (
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
            Live data from Snowflake
          </span>
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
        {/* New vs Existing Ads */}
        <ChartCard title="New vs Existing Ads" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={newVsExisting}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="advertiser"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip formatter={(value: unknown) => [`${value}%`, undefined] as [string, undefined]} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="newAdsPct" name="New" stackId="a" fill="#6366F1" />
                <Bar dataKey="existingAdsPct" name="Existing" stackId="a" fill="#E2E8F0" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* New Ads Trend */}
        <ChartCard title="New Ads Trend" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={newAdsTrendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {brandKeys.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key.charAt(0).toUpperCase() + key.slice(1)}
                    stroke={BRAND_COLORS[key as keyof typeof BRAND_COLORS] ?? '#94A3B8'}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        {/* Performance Index Trend */}
        <ChartCard title="Performance Index Trend" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="orlen" name="ORLEN" stroke={BRAND_COLORS.orlen} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="market" name="Market avg." stroke="#94A3B8" strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Weekly Movement Details Table */}
        <div className="bg-white rounded-lg border border-border shadow-sm p-5">
          <p className="text-sm font-semibold leading-tight mb-4">Weekly Movement Details</p>
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
                  <TableCell className="text-xs text-right tabular-nums">
                    €{row.weeklySpend.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.avgPi ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
