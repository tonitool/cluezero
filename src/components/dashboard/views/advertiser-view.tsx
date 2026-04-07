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
import { PLATFORM_COLORS } from '@/components/dashboard/_components/constants'
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { ChartTooltip, TICK, GRID, GRID_H, ACTIVE_DOT, fmtPercent } from '@/components/dashboard/_components/chart-theme'
import {
  platformDistributionByAdvertiser,
  platformStrategyComparison,
  newAdsByAdvertiserPlatform,
  performanceIndexRanking,
} from '@/components/dashboard/mock-data'

export function AdvertiserView() {
  const [, setColorTick] = useState(0)
  useEffect(() => {
    const h = () => setColorTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, h)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, h)
  }, [])

  return (
    <div>
      <SectionHeader
        title="Advertiser Benchmark"
        description="Platform distribution, strategy comparison, and performance rankings"
      />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Platform Distribution by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformDistributionByAdvertiser} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid {...GRID_H} />
                <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={64} />
                <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtPercent} />} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="meta"     name="Meta"     stackId="a" fill={PLATFORM_COLORS.meta} />
                <Bar dataKey="google"   name="Google"   stackId="a" fill={PLATFORM_COLORS.google} />
                <Bar dataKey="linkedin" name="LinkedIn" stackId="a" fill={PLATFORM_COLORS.linkedin} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Platform Strategy: Market vs Brand" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStrategyComparison} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="segment" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtPercent} />} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="meta"     name="Meta"     fill={PLATFORM_COLORS.meta}     radius={[3, 3, 0, 0]} />
                <Bar dataKey="google"   name="Google"   fill={PLATFORM_COLORS.google}   radius={[3, 3, 0, 0]} />
                <Bar dataKey="linkedin" name="LinkedIn" fill={PLATFORM_COLORS.linkedin} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <ChartCard title="New Ads by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={newAdsByAdvertiserPlatform} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip content={(p) => <ChartTooltip {...p} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="orlenMeta"   name="ORLEN Meta"   stroke={getBrandColor('orlen', 0)} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="orlenGoogle" name="ORLEN Google" stroke={getBrandColor('orlen', 0)} strokeWidth={2}   dot={false} strokeDasharray="4 3"   activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="aralMeta"    name="Aral Meta"    stroke={getBrandColor('aral',  1)} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                <Line type="monotone" dataKey="aralGoogle"  name="Aral Google"  stroke={getBrandColor('aral',  1)} strokeWidth={2}   dot={false} strokeDasharray="4 3"   activeDot={ACTIVE_DOT} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Performance Index Ranking" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceIndexRanking} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid {...GRID_H} />
                <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} domain={[0, 80]} />
                <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={64} />
                <Tooltip content={(p) => <ChartTooltip {...p} />} />
                <Bar dataKey="score" name="PI Score" radius={[0, 3, 3, 0]}>
                  {performanceIndexRanking.map((entry) => (
                    <Cell key={entry.advertiser} fill={getBrandColor(entry.advertiser, 0)} />
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
