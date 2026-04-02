'use client'

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
  executiveMetrics,
  weeklySpendMovement,
  spendShareTrend,
  weeklyMovementMetrics,
  newVsExistingByAdvertiser,
  newAdsTrend,
  performanceTrend,
  weeklyMovementTable,
} from '@/components/dashboard/mock-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function SubSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function OverviewView() {
  return (
    <div>
      <SectionHeader
        title="Market Overview"
        description="Executive KPIs, spend movement, and weekly market activity"
      />

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {executiveMetrics.map((metric) => (
          <KpiCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            direction={metric.direction}
          />
        ))}
      </div>

      {/* Spend charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Weekly Est. Spend Movement" height={260}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySpendMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: unknown) => [`€${Number(value).toLocaleString()}`, undefined] as [string, undefined]} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="orlen" name="ORLEN" stackId="a" fill={BRAND_COLORS.orlen} />
                <Bar dataKey="aral" name="Aral" stackId="a" fill={BRAND_COLORS.aral} />
                <Bar dataKey="circleK" name="Circle K" stackId="a" fill={BRAND_COLORS.circleK} />
                <Bar dataKey="eni" name="ENI" stackId="a" fill={BRAND_COLORS.eni} />
                <Bar dataKey="esso" name="Esso" stackId="a" fill={BRAND_COLORS.esso} />
                <Bar dataKey="shell" name="Shell" stackId="a" fill={BRAND_COLORS.shell} radius={[3, 3, 0, 0]} />
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
                {Object.entries(BRAND_COLORS).map(([key, color]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key === 'circleK' ? 'Circle K' : key.charAt(0).toUpperCase() + key.slice(1)}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <SubSection label="Weekly Movement" />

      {/* Movement KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {weeklyMovementMetrics.map((metric) => (
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

      {/* Movement charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <ChartCard title="New vs Existing Ads" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={newVsExistingByAdvertiser}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
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
                <Line type="monotone" dataKey="orlen" name="ORLEN" stroke={BRAND_COLORS.orlen} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="aral" name="Aral" stroke={BRAND_COLORS.aral} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="eni" name="ENI" stroke={BRAND_COLORS.eni} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="esso" name="Esso" stroke={BRAND_COLORS.esso} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="shell" name="Shell" stroke={BRAND_COLORS.shell} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Movement charts row 2 */}
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
              {weeklyMovementTable.map((row) => (
                <TableRow key={`${row.advertiser}-${row.platform}`}>
                  <TableCell className="text-xs font-medium">{row.advertiser}</TableCell>
                  <TableCell className="text-xs">{row.platform}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.totalAds}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.newAds}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">€{row.weeklySpend.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.avgPi}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
