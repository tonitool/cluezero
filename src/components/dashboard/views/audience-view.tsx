'use client'

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import {
  audienceMinAgeDistribution,
  audienceMaxAgeDistribution,
  audienceGenderDistribution,
  targetingLocationTop10,
} from '@/components/dashboard/mock-data'

export function AudienceView() {
  return (
    <div>
      <SectionHeader
        title="Audience Benchmark"
        description="Age, gender, and location targeting used by competitors"
      />

      {/* Age targeting row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Min Age Targeting */}
        <ChartCard title="Min Age Targeting" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={audienceMinAgeDistribution}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 36 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="bucket"
                tick={{ fontSize: 11 }}
                width={32}
              />
              <Tooltip />
              <Bar dataKey="ads" fill="#6366F1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Max Age Targeting */}
        <ChartCard title="Max Age Targeting" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={audienceMaxAgeDistribution}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 52 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="bucket"
                tick={{ fontSize: 11 }}
                width={48}
              />
              <Tooltip />
              <Bar dataKey="ads" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gender and location row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        {/* Gender Distribution */}
        <ChartCard title="Gender Distribution" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={audienceGenderDistribution}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 88 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="bucket"
                tick={{ fontSize: 11 }}
                width={84}
              />
              <Tooltip />
              <Bar dataKey="ads" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top 10 Locations */}
        <ChartCard title="Top 10 Locations" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={targetingLocationTop10}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 68 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="location"
                tick={{ fontSize: 11 }}
                width={64}
              />
              <Tooltip />
              <Bar dataKey="ads" fill="#F59E0B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
