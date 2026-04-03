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
  Cell,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { FUNNEL_COLORS } from '@/components/dashboard/_components/constants'
import { ChartTooltip, TICK, GRID, GRID_H, ACTIVE_DOT } from '@/components/dashboard/_components/chart-theme'
import {
  funnelDistribution,
  funnelByAdvertiser,
  newAdsByFunnel,
} from '@/components/dashboard/mock-data'

export function FunnelView() {
  return (
    <div>
      <SectionHeader
        title="Funnel Benchmark"
        description="How competitors distribute spend across the marketing funnel"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Funnel Stage Distribution" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 52 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="stage" tick={TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelDistribution.map((entry) => (
                  <Cell
                    key={`cell-${entry.stage}`}
                    fill={FUNNEL_COLORS[entry.stage as keyof typeof FUNNEL_COLORS]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Funnel Mix by Advertiser" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelByAdvertiser} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 64 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={60} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="see"   name="See"   stackId="a" fill={FUNNEL_COLORS.See} />
              <Bar dataKey="think" name="Think" stackId="a" fill={FUNNEL_COLORS.Think} />
              <Bar dataKey="doo"   name="Do"    stackId="a" fill={FUNNEL_COLORS.Do} />
              <Bar dataKey="care"  name="Care"  stackId="a" fill={FUNNEL_COLORS.Care} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="New Ads by Funnel Stage Over Time" height={260} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={newAdsByFunnel} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip content={(p) => <ChartTooltip {...p} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey="see"   name="See"   stroke={FUNNEL_COLORS.See}   strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
            <Line type="monotone" dataKey="think" name="Think" stroke={FUNNEL_COLORS.Think} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
            <Line type="monotone" dataKey="doo"   name="Do"    stroke={FUNNEL_COLORS.Do}    strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
            <Line type="monotone" dataKey="care"  name="Care"  stroke={FUNNEL_COLORS.Care}  strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
