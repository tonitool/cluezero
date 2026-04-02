'use client'

import { useState, useEffect } from 'react'
import {
  Bar, BarChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@/components/dashboard/_components/kpi-card'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { BRAND_COLORS } from '@/components/dashboard/_components/constants'
import {
  executiveMetrics as mockExecutiveMetrics,
  weeklySpendMovement as mockWeeklySpendMovement,
  spendShareTrend as mockSpendShareTrend,
  weeklyMovementMetrics as mockWeeklyMovementMetrics,
  newVsExistingByAdvertiser as mockNewVsExisting,
  newAdsTrend as mockNewAdsTrend,
  performanceTrend as mockPerformanceTrend,
  weeklyMovementTable as mockTable,
} from '@/components/dashboard/mock-data'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const BRAND_ENTRIES = Object.entries(BRAND_COLORS) as [string, string][]

function SubSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

interface Props { workspaceId?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OverviewData = Record<string, any>

export function OverviewView({ workspaceId }: Props) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/data/overview?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => { if (d.hasData) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (loading) return (
    <div>
      <SectionHeader title="Market Overview" description="Executive KPIs, spend movement, and weekly market activity" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        {[1,2].map(i => <div key={i} className="h-64 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
    </div>
  )

  const executiveMetrics   = data?.executiveMetrics   ?? mockExecutiveMetrics
  const weeklySpendMovement = data?.weeklySpendMovement ?? mockWeeklySpendMovement
  const spendShareTrend     = data?.spendShareTrend     ?? mockSpendShareTrend
  const weeklyMovementMetrics = data?.weeklyMovementMetrics ?? mockWeeklyMovementMetrics
  const newVsExistingByAdvertiser = data?.newVsExistingByAdvertiser ?? mockNewVsExisting
  const newAdsTrend         = data?.newAdsTrend         ?? mockNewAdsTrend
  const performanceTrend    = data?.performanceTrend    ?? mockPerformanceTrend
  const weeklyMovementTable = data?.table               ?? mockTable
  const activeBrands: string[] = data?.brands ?? BRAND_ENTRIES.map(([k]) => k)

  return (
    <div>
      <SectionHeader
        title="Market Overview"
        description="Executive KPIs, spend movement, and weekly market activity"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {executiveMetrics.map((metric: typeof mockExecutiveMetrics[0]) => (
          <KpiCard key={metric.label} label={metric.label} value={metric.value} delta={metric.delta} direction={metric.direction} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Weekly Est. Spend Movement" height={260}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySpendMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: unknown) => [`€${Number(value).toLocaleString()}`, undefined] as [string, undefined]} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {activeBrands.map((bKey, i) => (
                  <Bar key={bKey} dataKey={bKey} name={bKey === 'circleK' ? 'Circle K' : bKey.charAt(0).toUpperCase() + bKey.slice(1)} stackId="a" fill={BRAND_COLORS[bKey] ?? `hsl(${i * 60},70%,50%)`} radius={i === activeBrands.length - 1 ? [3, 3, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="ORLEN Share of Weekly Est. Spend" height={260}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendShareTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: unknown) => [`${value}%`, undefined] as [string, undefined]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {activeBrands.map((bKey, i) => (
                  <Line key={bKey} type="monotone" dataKey={bKey} name={bKey === 'circleK' ? 'Circle K' : bKey.charAt(0).toUpperCase() + bKey.slice(1)} stroke={BRAND_COLORS[bKey] ?? `hsl(${i * 60},70%,50%)`} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <SubSection label="Weekly Movement" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {weeklyMovementMetrics.map((metric: typeof mockWeeklyMovementMetrics[0]) => (
          <KpiCard key={metric.label} label={metric.label} value={metric.value} subtitle={metric.subtitle} delta={metric.delta} direction={metric.direction} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <ChartCard title="New vs Existing Ads" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={newVsExistingByAdvertiser} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <YAxis type="category" dataKey="advertiser" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(value: unknown) => [`${value}%`, undefined] as [string, undefined]} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="newAdsPct" name="New" stackId="a" fill="#6366F1" />
                <Bar dataKey="existingAdsPct" name="Existing" stackId="a" fill="#E2E8F0" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="New Ads Trend" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={newAdsTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {activeBrands.map((bKey, i) => (
                  <Line key={bKey} type="monotone" dataKey={bKey} name={bKey === 'circleK' ? 'Circle K' : bKey.charAt(0).toUpperCase() + bKey.slice(1)} stroke={BRAND_COLORS[bKey] ?? `hsl(${i * 60},70%,50%)`} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
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
              {weeklyMovementTable.map((row: typeof mockTable[0]) => (
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
        </div>
      </div>
    </div>
  )
}
