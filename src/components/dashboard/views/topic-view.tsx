'use client'

import { useState, useEffect } from 'react'
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
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { ChartTooltip, TICK, GRID, GRID_H, ACTIVE_DOT } from '@/components/dashboard/_components/chart-theme'
import {
  topicDistribution,
  topicByAdvertiser,
  newAdsByTopic,
} from '@/components/dashboard/mock-data'

const TOPIC_LINE_COLORS: Record<string, string> = {
  shop:            '#6366F1',
  existing:        '#0EA5E9',
  laden:           '#10B981',
  stellenanzeigen: '#F59E0B',
  waschen:         '#E4002B',
}

export function TopicView() {
  const [, setColorTick] = useState(0)
  useEffect(() => {
    const h = () => setColorTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, h)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, h)
  }, [])

  return (
    <div>
      <SectionHeader
        title="Topic Benchmark"
        description="Which topics competitors are investing in this week"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Topic Distribution" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 80 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="topic" tick={TICK} tickLine={false} axisLine={false} width={76} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="totalAds" radius={[0, 4, 4, 0]}>
                {topicDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getBrandColor('', index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Topic Share by Advertiser" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicByAdvertiser} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 64 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={60} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="shop"            name="Shop"            stackId="a" fill={TOPIC_LINE_COLORS.shop} />
              <Bar dataKey="existing"        name="Existing"        stackId="a" fill={TOPIC_LINE_COLORS.existing} />
              <Bar dataKey="laden"           name="Laden"           stackId="a" fill={TOPIC_LINE_COLORS.laden} />
              <Bar dataKey="stellenanzeigen" name="Stellenanzeigen" stackId="a" fill={TOPIC_LINE_COLORS.stellenanzeigen} />
              <Bar dataKey="waschen"         name="Waschen"         stackId="a" fill={TOPIC_LINE_COLORS.waschen} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="New Ads by Topic Over Time" height={260} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={newAdsByTopic} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip content={(p) => <ChartTooltip {...p} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey="shop"            name="Shop"            stroke={TOPIC_LINE_COLORS.shop}            strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
            <Line type="monotone" dataKey="existing"        name="Existing"        stroke={TOPIC_LINE_COLORS.existing}        strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
            <Line type="monotone" dataKey="laden"           name="Laden"           stroke={TOPIC_LINE_COLORS.laden}           strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
            <Line type="monotone" dataKey="stellenanzeigen" name="Stellenanzeigen" stroke={TOPIC_LINE_COLORS.stellenanzeigen} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
            <Line type="monotone" dataKey="waschen"         name="Waschen"         stroke={TOPIC_LINE_COLORS.waschen}         strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
