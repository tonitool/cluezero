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
import { BRAND_COLORS } from '@/components/dashboard/_components/constants'
import {
  topicDistribution,
  topicByAdvertiser,
  newAdsByTopic,
} from '@/components/dashboard/mock-data'

const BRAND_COLOR_VALUES = Object.values(BRAND_COLORS)

const TOPIC_LINE_COLORS: Record<string, string> = {
  shop:            '#6366F1',
  existing:        '#0EA5E9',
  laden:           '#10B981',
  stellenanzeigen: '#F59E0B',
  waschen:         '#E4002B',
}

export function TopicView() {
  return (
    <div>
      <SectionHeader
        title="Topic Benchmark"
        description="Which topics competitors are investing in this week"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Topic Distribution */}
        <ChartCard title="Topic Distribution" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topicDistribution}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="topic"
                tick={{ fontSize: 11 }}
                width={76}
              />
              <Tooltip />
              <Bar dataKey="totalAds" radius={[0, 4, 4, 0]}>
                {topicDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BRAND_COLOR_VALUES[index % BRAND_COLOR_VALUES.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Topic Share by Advertiser */}
        <ChartCard title="Topic Share by Advertiser" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topicByAdvertiser}
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
              <Bar dataKey="shop" name="Shop" stackId="a" fill={TOPIC_LINE_COLORS.shop} />
              <Bar dataKey="existing" name="Existing" stackId="a" fill={TOPIC_LINE_COLORS.existing} />
              <Bar dataKey="laden" name="Laden" stackId="a" fill={TOPIC_LINE_COLORS.laden} />
              <Bar dataKey="stellenanzeigen" name="Stellenanzeigen" stackId="a" fill={TOPIC_LINE_COLORS.stellenanzeigen} />
              <Bar dataKey="waschen" name="Waschen" stackId="a" fill={TOPIC_LINE_COLORS.waschen} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* New Ads by Topic Over Time */}
      <ChartCard title="New Ads by Topic Over Time" height={260} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={newAdsByTopic}
            margin={{ top: 4, right: 24, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="shop"
              name="Shop"
              stroke={TOPIC_LINE_COLORS.shop}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="existing"
              name="Existing"
              stroke={TOPIC_LINE_COLORS.existing}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="laden"
              name="Laden"
              stroke={TOPIC_LINE_COLORS.laden}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="stellenanzeigen"
              name="Stellenanzeigen"
              stroke={TOPIC_LINE_COLORS.stellenanzeigen}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="waschen"
              name="Waschen"
              stroke={TOPIC_LINE_COLORS.waschen}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
