'use client'

import { useState, useEffect } from 'react'
import {
  Bar, BarChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { BRAND_COLORS, PLATFORM_COLORS } from '@/components/dashboard/_components/constants'
import {
  platformDistributionByAdvertiser as mockPlatDist,
  platformStrategyComparison as mockPlatStrategy,
  newAdsByAdvertiserPlatform as mockNewAdsByPlatform,
  performanceIndexRanking as mockPiRanking,
  topicDistribution as mockTopicDist,
  topicByAdvertiser as mockTopicByAdv,
  newAdsByTopic as mockNewAdsByTopic,
  audienceMinAgeDistribution,
  audienceMaxAgeDistribution,
  audienceGenderDistribution,
  targetingLocationTop10,
} from '@/components/dashboard/mock-data'

const BRAND_COLOR_VALUES = Object.values(BRAND_COLORS)

// Palette for dynamic topics
const TOPIC_PALETTE = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#E4002B', '#8B5CF6', '#EC4899', '#14B8A6']

function SubSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

interface Props { workspaceId?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompetitiveData = Record<string, any>

export function CompetitiveView({ workspaceId }: Props) {
  const [data, setData] = useState<CompetitiveData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/data/competitive?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => { if (d.hasData) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (loading) return (
    <div>
      <SectionHeader title="Competitive Intelligence" description="Advertiser benchmarks, topic investment, and audience targeting analysis" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-72 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
    </div>
  )

  const performanceIndexRanking    = data?.performanceIndexRanking    ?? mockPiRanking
  const topicDistribution          = data?.topicDistribution          ?? mockTopicDist
  const topicByAdvertiser          = data?.topicByAdvertiser          ?? mockTopicByAdv
  const newAdsByTopic              = data?.newAdsByTopic              ?? mockNewAdsByTopic
  const platformDistributionByAdvertiser = data?.platformDistributionByAdvertiser ?? mockPlatDist
  const platformStrategyComparison = data?.platformStrategyComparison ?? mockPlatStrategy
  // For new ads by advertiser/platform, keep mock since we don't have cross-platform data
  const newAdsByAdvertiserPlatform = mockNewAdsByPlatform

  // Dynamic topic keys from real data (or fall back to mock hardcoded keys)
  const topTopicKeys: string[] = data?.topTopicKeys ?? ['shop', 'existing', 'laden', 'stellenanzeigen', 'waschen']
  const topicColorMap: Record<string, string> = {}
  topTopicKeys.forEach((k, i) => { topicColorMap[k] = TOPIC_PALETTE[i % TOPIC_PALETTE.length] })

  return (
    <div>
      <SectionHeader
        title="Competitive Intelligence"
        description="Advertiser benchmarks, topic investment, and audience targeting analysis"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Platform Distribution by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformDistributionByAdvertiser} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <YAxis type="category" dataKey="advertiser" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(value: unknown) => [`${value}%`, undefined] as [string, undefined]} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="meta" name="Meta" stackId="a" fill={PLATFORM_COLORS.meta} />
                <Bar dataKey="google" name="Google" stackId="a" fill={PLATFORM_COLORS.google} />
                <Bar dataKey="linkedin" name="LinkedIn" stackId="a" fill={PLATFORM_COLORS.linkedin} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Platform Strategy: Market vs ORLEN" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStrategyComparison} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="segment" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(value: unknown) => [`${value}%`, undefined] as [string, undefined]} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="meta" name="Meta" fill={PLATFORM_COLORS.meta} radius={[3, 3, 0, 0]} />
                <Bar dataKey="google" name="Google" fill={PLATFORM_COLORS.google} radius={[3, 3, 0, 0]} />
                <Bar dataKey="linkedin" name="LinkedIn" fill={PLATFORM_COLORS.linkedin} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <ChartCard title="New Ads by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={newAdsByAdvertiserPlatform} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="orlenMeta" name="ORLEN Meta" stroke={BRAND_COLORS.orlen} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orlenGoogle" name="ORLEN Google" stroke={BRAND_COLORS.orlen} strokeWidth={2} dot={false} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="aralMeta" name="Aral Meta" stroke={BRAND_COLORS.aral} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="aralGoogle" name="Aral Google" stroke={BRAND_COLORS.aral} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Performance Index Ranking" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceIndexRanking} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                <YAxis type="category" dataKey="advertiser" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip />
                <Bar dataKey="score" name="PI Score" radius={[0, 3, 3, 0]}>
                  {performanceIndexRanking.map((entry: { advertiser: string }) => (
                    <Cell key={entry.advertiser} fill={entry.advertiser === 'ORLEN' ? BRAND_COLORS.orlen : '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <SubSection label="Topic Benchmark" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Topic Distribution" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={76} />
              <Tooltip />
              <Bar dataKey="totalAds" radius={[0, 4, 4, 0]}>
                {topicDistribution.map((_: unknown, index: number) => (
                  <Cell key={`cell-${index}`} fill={BRAND_COLOR_VALUES[index % BRAND_COLOR_VALUES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Topic Share by Advertiser" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicByAdvertiser} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 64 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="advertiser" tick={{ fontSize: 11 }} width={60} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {topTopicKeys.map((tKey, i) => (
                <Bar key={tKey} dataKey={tKey} name={tKey.replace(/_/g, ' ')} stackId="a" fill={TOPIC_PALETTE[i % TOPIC_PALETTE.length]} radius={i === topTopicKeys.length - 1 ? [0, 4, 4, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="New Ads by Topic Over Time" height={260} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={newAdsByTopic} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {topTopicKeys.map((tKey, i) => (
              <Line key={tKey} type="monotone" dataKey={tKey} name={tKey.replace(/_/g, ' ')} stroke={topicColorMap[tKey] ?? TOPIC_PALETTE[i % TOPIC_PALETTE.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <SubSection label="Audience Benchmark" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Min Age Targeting" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={audienceMinAgeDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 36 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="ads" fill="#6366F1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Max Age Targeting" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={audienceMaxAgeDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 52 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11 }} width={48} />
              <Tooltip />
              <Bar dataKey="ads" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Gender Distribution" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={audienceGenderDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 88 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11 }} width={84} />
              <Tooltip />
              <Bar dataKey="ads" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Locations" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={targetingLocationTop10} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 68 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="location" tick={{ fontSize: 11 }} width={64} />
              <Tooltip />
              <Bar dataKey="ads" fill="#F59E0B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
