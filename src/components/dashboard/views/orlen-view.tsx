'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { TICK, GRID } from '@/components/dashboard/_components/chart-theme'
import { Badge } from '@/components/ui/badge'
import { EditModeBar } from '@/components/dashboard/widget-system/edit-mode-bar'
import { AddWidgetSheet } from '@/components/dashboard/widget-system/add-widget-sheet'
import { SqlWidgetCard } from '@/components/dashboard/widget-system/sql-widget-card'
import { useWidgetConfigs } from '@/components/dashboard/widget-system/use-widget-configs'
import type { WidgetConfig, ChartType } from '@/components/dashboard/widget-system/types'

const STRATEGY_COLORS = {
  awareness: '#6366F1',
  conversion: '#0EA5E9',
  innovation: '#10B981',
  localTargeting: '#F59E0B',
}

function brandColorKey(advertiser: string): string {
  const n = advertiser.toLowerCase().replace(/[\s\-_]/g, '')
  if (n.includes('orlen')) return 'orlen'
  if (n.includes('aral')) return 'aral'
  if (n.includes('circlek') || n.includes('circle')) return 'circleK'
  if (n === 'eni' || n.startsWith('eni')) return 'eni'
  if (n.includes('esso')) return 'esso'
  if (n.includes('shell')) return 'shell'
  return 'orlen'
}

function ScoreDotsWhitespace({ score }: { score: number }) {
  return (
    <span className="tracking-widest text-xs text-muted-foreground select-none">
      {Array.from({ length: 5 }, (_, i) =>
        i < score
          ? <span key={i} className="text-amber-500">●</span>
          : <span key={i} className="text-muted-foreground/30">○</span>
      )}
    </span>
  )
}

function WhitespaceBadge({ level }: { level: string }) {
  if (level === 'High') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] px-1.5 py-0">High</Badge>
  if (level === 'Medium') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Medium</Badge>
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Low</Badge>
}

interface ScatterDotProps { cx?: number; cy?: number; payload?: { advertiser: string } }
function ScatterDot({ cx = 0, cy = 0, payload }: ScatterDotProps) {
  const color = getBrandColor(payload?.advertiser ?? '', 0)
  return <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
}

interface Props {
  workspaceId?: string
  ownBrand?: string
  connectionId?: string
  editMode?: boolean
  onEditModeChange?: (v: boolean) => void
  dateFrom?: string
  dateTo?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrlenData = Record<string, any>

export function OrlenView({ workspaceId, ownBrand = 'ORLEN', connectionId, editMode = false, onEditModeChange, dateFrom, dateTo }: Props) {
  const brandLabel = ownBrand || 'ORLEN'
  const [data, setData] = useState<OrlenData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)
  const [, setColorTick] = useState(0)
  useEffect(() => {
    const h = () => setColorTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, h)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, h)
  }, [])

  const wc = useWidgetConfigs(workspaceId, 'brand')

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    const src = connectionId ? `&connectionId=${connectionId}` : ''
    const df = dateFrom ? `&from=${dateFrom}` : ''
    const dt = dateTo ? `&to=${dateTo}` : ''
    fetch(`/api/data/orlen?workspaceId=${workspaceId}&brand=${encodeURIComponent(brandLabel)}${src}${df}${dt}`)
      .then(r => r.json())
      .then(d => { if (d.hasData) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId, brandLabel, connectionId, dateFrom, dateTo])

  if (loading) return (
    <div>
      <SectionHeader title={`${brandLabel} vs Market`} description="Scorecard comparison, competitor strategy profiles, and whitespace opportunities" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="h-72 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
    </div>
  )

  const orlenVsMarketScorecards  = data?.orlenVsMarketScorecards  ?? []
  const marketActivityVsPresence = data?.marketActivityVsPresence ?? []

  const sqlWidgets = wc.configs.filter(c => c.type === 'sql')

  return (
    <div>
      <SectionHeader
        title={`${brandLabel} vs Market`}
        description="Scorecard comparison, competitor strategy profiles, and whitespace opportunities"
      />

      {editMode && (
        <EditModeBar
          tab="brand"
          configs={wc.configs}
          onAddWidget={() => { setEditingWidget(null); setShowAddSheet(true) }}
          onDone={() => onEditModeChange?.(false)}
          onCancel={() => onEditModeChange?.(false)}
          saving={wc.saving}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {orlenVsMarketScorecards.map((item: { label: string; orlen: number | string; market: number | string }) => (
          <div key={item.label} className="bg-white rounded-lg border border-border shadow-sm p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{item.label}</p>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: getBrandColor(ownBrand, 0) }}>
                  {typeof item.orlen === 'number' && item.orlen >= 100 ? item.orlen.toLocaleString() : item.orlen}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">{brandLabel}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-2xl font-bold tabular-nums leading-none text-muted-foreground">
                  {typeof item.market === 'number' && item.market >= 100 ? item.market.toLocaleString() : item.market}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Market</p>
              </div>
            </div>
            <div className="mt-3">
              {(() => {
                const orlenVal = Number(item.orlen)
                const marketVal = Number(item.market)
                const delta = orlenVal - marketVal
                const isUp = delta >= 0
                return (
                  <Badge className={isUp ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] px-1.5 py-0' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-50 text-[10px] px-1.5 py-0'}>
                    {isUp ? '+' : ''}{delta % 1 !== 0 ? delta.toFixed(1) : delta}
                  </Badge>
                )
              })()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-2">
        <ChartCard title="Competitor Strategy Profiles" height={300}>
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            Strategy profile data is not available in the current data source.
          </div>
        </ChartCard>

        <ChartCard title="Market Activity vs Presence" height={300}>
          <div style={{ width: '100%', height: '100%' }}>
            {marketActivityVsPresence.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No data available.</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis type="number" dataKey="activity" name="Activity" label={{ value: 'Avg PI', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#71717a' }} tick={TICK} tickLine={false} axisLine={false} />
                <YAxis type="number" dataKey="presence" name="Total Ads" label={{ value: 'Total Ads', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#71717a' }} tick={TICK} tickLine={false} axisLine={false} />
                <ZAxis type="number" dataKey="reach" range={[60, 200]} name="Reach (k)" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded-xl bg-zinc-900/95 border border-zinc-700/50 px-3 py-2.5 shadow-2xl text-xs min-w-[130px] pointer-events-none">
                        <p className="text-white font-semibold pb-1.5 mb-2 border-b border-zinc-800">{d.advertiser}</p>
                        <div className="space-y-1">
                          <p className="text-zinc-300">Avg PI: <span className="text-white font-semibold">{d.activity}</span></p>
                          <p className="text-zinc-300">Total Ads: <span className="text-white font-semibold">{d.presence}</span></p>
                          <p className="text-zinc-300">Reach: <span className="text-white font-semibold">{d.reach}k</span></p>
                        </div>
                      </div>
                    )
                  }}
                />
                <Scatter data={marketActivityVsPresence} shape={(props: ScatterDotProps) => <ScatterDot {...props} />} />
              </ScatterChart>
            </ResponsiveContainer>
            )}
          </div>
          {marketActivityVsPresence.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2 px-1">
              {marketActivityVsPresence.map((item: { advertiser: string }) => (
                <div key={item.advertiser} className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getBrandColor(item.advertiser, 0) }} />
                  <span className="text-[11px] text-muted-foreground">{item.advertiser}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-border shadow-sm p-5">
        <p className="font-semibold text-sm mb-2">Top Opportunities</p>
        <p className="text-xs text-muted-foreground">Opportunity analysis is not available in the current data source.</p>
      </div>

      {/* SQL widgets inline */}
      {sqlWidgets.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
          {sqlWidgets.map(w => (
            <div key={w.id} className={w.colSpan === 2 ? 'col-span-2' : 'col-span-1'}>
              <SqlWidgetCard
                config={w}
                workspaceId={workspaceId ?? ''}
                editMode={editMode}
                onEdit={() => { setEditingWidget(w); setShowAddSheet(true) }}
                onDelete={() => wc.deleteWidget(w.id)}
              />
            </div>
          ))}
        </div>
      )}

      {showAddSheet && workspaceId && (
        <AddWidgetSheet
          workspaceId={workspaceId}
          tab="brand"
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
