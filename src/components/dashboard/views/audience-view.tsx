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
import { ChartTooltip, TICK, GRID_H } from '@/components/dashboard/_components/chart-theme'
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
        <ChartCard title="Min Age Targeting" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={audienceMinAgeDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 36 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="bucket" tick={TICK} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="ads" fill="#6366F1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Max Age Targeting" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={audienceMaxAgeDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 52 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="bucket" tick={TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="ads" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gender and location row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Gender Distribution" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={audienceGenderDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 88 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="bucket" tick={TICK} tickLine={false} axisLine={false} width={84} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="ads" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Locations" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={targetingLocationTop10} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 68 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="location" tick={TICK} tickLine={false} axisLine={false} width={64} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Bar dataKey="ads" fill="#F59E0B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
