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
import { ChartTooltip, TICK, GRID, ACTIVE_DOT, fmtCurrency, fmtPercent } from '@/components/dashboard/_components/chart-theme'
import {
  executiveMetrics,
  weeklySpendMovement,
  spendShareTrend,
} from '@/components/dashboard/mock-data'

export function ExecutiveView() {
  return (
    <div>
      <SectionHeader
        title="Executive Summary"
        description="KPI toplines, weekly spend movement, and share of voice trends"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Weekly Est. Spend Movement" height={260}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySpendMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtCurrency} />} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="orlen"   name="ORLEN"    stackId="a" fill={BRAND_COLORS.orlen} />
                <Bar dataKey="aral"    name="Aral"     stackId="a" fill={BRAND_COLORS.aral} />
                <Bar dataKey="circleK" name="Circle K" stackId="a" fill={BRAND_COLORS.circleK} />
                <Bar dataKey="eni"     name="ENI"      stackId="a" fill={BRAND_COLORS.eni} />
                <Bar dataKey="esso"    name="Esso"     stackId="a" fill={BRAND_COLORS.esso} />
                <Bar dataKey="shell"   name="Shell"    stackId="a" fill={BRAND_COLORS.shell} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Share of Weekly Est. Spend by Brand" height={260}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendShareTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtPercent} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="orlen"   name="ORLEN"    stroke={BRAND_COLORS.orlen}   strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="aral"    name="Aral"     stroke={BRAND_COLORS.aral}    strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="circleK" name="Circle K" stroke={BRAND_COLORS.circleK} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="eni"     name="ENI"      stroke={BRAND_COLORS.eni}     strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="esso"    name="Esso"     stroke={BRAND_COLORS.esso}    strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="shell"   name="Shell"    stroke={BRAND_COLORS.shell}   strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
