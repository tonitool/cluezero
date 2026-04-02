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
        {/* Funnel Stage Distribution */}
        <ChartCard title="Funnel Stage Distribution" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={funnelDistribution}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 52 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fontSize: 11 }}
                width={48}
              />
              <Tooltip />
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

        {/* Funnel Mix by Advertiser */}
        <ChartCard title="Funnel Mix by Advertiser" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={funnelByAdvertiser}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 64 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="advertiser"
                tick={{ fontSize: 11 }}
                width={60}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="see" name="See" stackId="a" fill={FUNNEL_COLORS.See} />
              <Bar dataKey="think" name="Think" stackId="a" fill={FUNNEL_COLORS.Think} />
              <Bar dataKey="doo" name="Do" stackId="a" fill={FUNNEL_COLORS.Do} />
              <Bar dataKey="care" name="Care" stackId="a" fill={FUNNEL_COLORS.Care} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* New Ads by Funnel Stage Over Time */}
      <ChartCard title="New Ads by Funnel Stage Over Time" height={260} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={newAdsByFunnel}
            margin={{ top: 4, right: 24, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="see"
              name="See"
              stroke={FUNNEL_COLORS.See}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="think"
              name="Think"
              stroke={FUNNEL_COLORS.Think}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="doo"
              name="Do"
              stroke={FUNNEL_COLORS.Do}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="care"
              name="Care"
              stroke={FUNNEL_COLORS.Care}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
