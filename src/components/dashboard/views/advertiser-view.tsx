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
import { BRAND_COLORS, PLATFORM_COLORS } from '@/components/dashboard/_components/constants'
import {
  platformDistributionByAdvertiser,
  platformStrategyComparison,
  newAdsByAdvertiserPlatform,
  performanceIndexRanking,
} from '@/components/dashboard/mock-data'

export function AdvertiserView() {
  return (
    <div>
      <SectionHeader
        title="Advertiser Benchmark"
        description="Platform distribution, strategy comparison, and performance rankings"
      />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Platform Distribution by Advertiser */}
        <ChartCard title="Platform Distribution by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={platformDistributionByAdvertiser}
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
                <Legend
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="meta"
                  name="Meta"
                  stackId="a"
                  fill={PLATFORM_COLORS.meta}
                />
                <Bar
                  dataKey="google"
                  name="Google"
                  stackId="a"
                  fill={PLATFORM_COLORS.google}
                />
                <Bar
                  dataKey="linkedin"
                  name="LinkedIn"
                  stackId="a"
                  fill={PLATFORM_COLORS.linkedin}
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Platform Strategy: Market vs ORLEN */}
        <ChartCard title="Platform Strategy: Market vs ORLEN" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={platformStrategyComparison}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="segment"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip formatter={(value: unknown) => [`${value}%`, undefined] as [string, undefined]} />
                <Legend
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="meta"
                  name="Meta"
                  fill={PLATFORM_COLORS.meta}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="google"
                  name="Google"
                  fill={PLATFORM_COLORS.google}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="linkedin"
                  name="LinkedIn"
                  fill={PLATFORM_COLORS.linkedin}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        {/* New Ads by Advertiser */}
        <ChartCard title="New Ads by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={newAdsByAdvertiserPlatform}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="orlenMeta"
                  name="ORLEN Meta"
                  stroke={BRAND_COLORS.orlen}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="orlenGoogle"
                  name="ORLEN Google"
                  stroke={BRAND_COLORS.orlen}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 3"
                />
                <Line
                  type="monotone"
                  dataKey="aralMeta"
                  name="Aral Meta"
                  stroke={BRAND_COLORS.aral}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="aralGoogle"
                  name="Aral Google"
                  stroke={BRAND_COLORS.aral}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Performance Index Ranking */}
        <ChartCard title="Performance Index Ranking" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={performanceIndexRanking}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 80]}
                />
                <YAxis
                  type="category"
                  dataKey="advertiser"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip />
                <Bar dataKey="score" name="PI Score" radius={[0, 3, 3, 0]}>
                  {performanceIndexRanking.map((entry) => (
                    <Cell
                      key={entry.advertiser}
                      fill={entry.advertiser === 'ORLEN' ? BRAND_COLORS.orlen : '#94A3B8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
