'use client'

import { useState, useEffect } from 'react'
import {
  Bar, BarChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { PLATFORM_COLORS } from '@/components/dashboard/_components/constants'
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { ChartTooltip, TICK, GRID, GRID_H, ACTIVE_DOT, fmtPercent } from '@/components/dashboard/_components/chart-theme'
import { EditModeBar } from '@/components/dashboard/widget-system/edit-mode-bar'
import { AddWidgetSheet } from '@/components/dashboard/widget-system/add-widget-sheet'
import { SqlWidgetCard } from '@/components/dashboard/widget-system/sql-widget-card'
import { useWidgetConfigs } from '@/components/dashboard/widget-system/use-widget-configs'
import type { WidgetConfig, ChartType } from '@/components/dashboard/widget-system/types'

// Palette for topic-based charts (not brand-specific)
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

function EmptyState({ label }: { label: string }) {
  return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{label}</div>
}

interface Props {
  workspaceId?: string
  connectionId?: string
  editMode?: boolean
  onEditModeChange?: (v: boolean) => void
  dateFrom?: string
  dateTo?: string
  datePeriod?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompetitiveData = Record<string, any>

export function CompetitiveView({ workspaceId, connectionId, editMode = false, onEditModeChange, dateFrom, dateTo, datePeriod }: Props) {
  const [data, setData] = useState<CompetitiveData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)
  // Re-render when brand colors change in Setup
  const [, setColorTick] = useState(0)
  useEffect(() => {
    const h = () => setColorTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, h)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, h)
  }, [])

  const wc = useWidgetConfigs(workspaceId, 'competitive')

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    const src = connectionId ? `&connectionId=${connectionId}` : ''
    const df = dateFrom ? `&from=${dateFrom}` : ''
    const dt = dateTo ? `&to=${dateTo}` : ''
    const dp = datePeriod ? `&period=${datePeriod}` : ''
    fetch(`/api/data/competitive?workspaceId=${workspaceId}${src}${df}${dt}${dp}`)
      .then(r => r.json())
      .then(d => { if (d.hasData) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId, connectionId, dateFrom, dateTo, datePeriod])

  if (loading) return (
    <div>
      <SectionHeader title="Competitive Intelligence" description="Advertiser benchmarks, topic investment, and audience targeting analysis" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-72 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
    </div>
  )

  const performanceIndexRanking          = data?.performanceIndexRanking          ?? []
  const topicDistribution                = data?.topicDistribution                ?? []
  const topicByAdvertiser                = data?.topicByAdvertiser                ?? []
  const newAdsByTopic                    = data?.newAdsByTopic                    ?? []
  const platformDistributionByAdvertiser = data?.platformDistributionByAdvertiser ?? []
  const platformStrategyComparison       = data?.platformStrategyComparison       ?? []
  const topTopicKeys: string[]           = data?.topTopicKeys                     ?? []

  const topicColorMap: Record<string, string> = {}
  topTopicKeys.forEach((k, i) => { topicColorMap[k] = TOPIC_PALETTE[i % TOPIC_PALETTE.length] })

  const sqlWidgets = wc.configs.filter(c => c.type === 'sql')

  return (
    <div>
      <SectionHeader
        title="Competitive Intelligence"
        description="Advertiser benchmarks, topic investment, and audience targeting analysis"
      />

      {editMode && (
        <EditModeBar
          tab="competitive"
          configs={wc.configs}
          onAddWidget={() => { setEditingWidget(null); setShowAddSheet(true) }}
          onDone={() => onEditModeChange?.(false)}
          onCancel={() => onEditModeChange?.(false)}
          saving={wc.saving}
        />
      )}

      {!data && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          No data yet — connect Snowflake and run a sync to populate this view.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Platform Distribution by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            {platformDistributionByAdvertiser.length === 0 ? <EmptyState label="No data" /> : (
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
            )}
          </div>
        </ChartCard>

        <ChartCard title="Platform Strategy: Market vs Brand" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            {platformStrategyComparison.length === 0 ? <EmptyState label="No data" /> : (
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
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <ChartCard title="New Ads by Advertiser" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            {newAdsByTopic.length === 0 ? <EmptyState label="No data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newAdsByTopic} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} />
                  <Tooltip content={(p) => <ChartTooltip {...p} />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {topTopicKeys.map((tKey, i) => (
                    <Line key={tKey} type="monotone" dataKey={tKey} name={tKey.replace(/_/g, ' ')} stroke={topicColorMap[tKey] ?? TOPIC_PALETTE[i % TOPIC_PALETTE.length]} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Performance Index Ranking" height={280}>
          <div style={{ width: '100%', height: '100%' }}>
            {performanceIndexRanking.length === 0 ? <EmptyState label="No PI data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceIndexRanking} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid {...GRID_H} />
                  <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={64} />
                  <Tooltip content={(p) => <ChartTooltip {...p} />} />
                  <Bar dataKey="score" name="PI Score" radius={[0, 3, 3, 0]}>
                    {performanceIndexRanking.map((entry: { advertiser: string }, i: number) => (
                      <Cell key={entry.advertiser} fill={getBrandColor(entry.advertiser, i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      <SubSection label="Topic Benchmark" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Topic Distribution" height={260}>
          {topicDistribution.length === 0 ? <EmptyState label="No topic data" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicDistribution} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 80 }}>
                <CartesianGrid {...GRID_H} />
                <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="topic" tick={TICK} tickLine={false} axisLine={false} width={76} />
                <Tooltip content={(p) => <ChartTooltip {...p} />} />
                <Bar dataKey="totalAds" radius={[0, 4, 4, 0]}>
                  {topicDistribution.map((_: unknown, index: number) => (
                    <Cell key={`cell-${index}`} fill={TOPIC_PALETTE[index % TOPIC_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Topic Share by Advertiser" height={260}>
          {topicByAdvertiser.length === 0 ? <EmptyState label="No topic data" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicByAdvertiser} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 64 }}>
                <CartesianGrid {...GRID_H} />
                <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={(p) => <ChartTooltip {...p} />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {topTopicKeys.map((tKey, i) => (
                  <Bar key={tKey} dataKey={tKey} name={tKey.replace(/_/g, ' ')} stackId="a" fill={TOPIC_PALETTE[i % TOPIC_PALETTE.length]} radius={i === topTopicKeys.length - 1 ? [0, 4, 4, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="New Ads by Topic Over Time" height={260} className="mt-4">
        {newAdsByTopic.length === 0 ? <EmptyState label="No topic data" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={newAdsByTopic} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} />
              <Tooltip content={(p) => <ChartTooltip {...p} />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {topTopicKeys.map((tKey, i) => (
                <Line key={tKey} type="monotone" dataKey={tKey} name={tKey.replace(/_/g, ' ')} stroke={topicColorMap[tKey] ?? TOPIC_PALETTE[i % TOPIC_PALETTE.length]} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <SubSection label="Audience Benchmark" />
      <div className="px-4 py-3 bg-zinc-50 border border-border rounded-lg text-xs text-muted-foreground">
        Audience age, gender, and location data is not available in the current data source.
      </div>

      {sqlWidgets.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2">Custom widgets</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {sqlWidgets.map(w => (
              <SqlWidgetCard
                key={w.id}
                config={w}
                workspaceId={workspaceId ?? ''}
                editMode={editMode}
                onEdit={() => { setEditingWidget(w); setShowAddSheet(true) }}
                onDelete={() => wc.deleteWidget(w.id)}
              />
            ))}
          </div>
        </div>
      )}

      {showAddSheet && workspaceId && (
        <AddWidgetSheet
          workspaceId={workspaceId}
          tab="competitive"
          editingWidget={editingWidget}
          onSave={async (params) => {
            if (editingWidget) {
              await wc.updateWidget(editingWidget.id, {
                title: params.title,
                sqlQuery: params.sqlQuery,
                chartType: params.chartType as ChartType,
                colSpan: params.colSpan,
              })
            } else {
              await wc.addSqlWidget(params)
            }
          }}
          onClose={() => { setShowAddSheet(false); setEditingWidget(null) }}
        />
      )}
    </div>
  )
}
