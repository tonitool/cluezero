'use client'

import { useState, useEffect } from 'react'
import {
  Bar, BarChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { KpiCard } from '@/components/dashboard/_components/kpi-card'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { ChartTooltip, TICK, GRID, GRID_H, ACTIVE_DOT, fmtCurrency, fmtPercent } from '@/components/dashboard/_components/chart-theme'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { WidgetWrapper } from '@/components/dashboard/widget-system/widget-wrapper'
import { SqlWidgetCard } from '@/components/dashboard/widget-system/sql-widget-card'
import { AddWidgetSheet } from '@/components/dashboard/widget-system/add-widget-sheet'
import { EditModeBar } from '@/components/dashboard/widget-system/edit-mode-bar'
import { useWidgetConfigs } from '@/components/dashboard/widget-system/use-widget-configs'
import type { WidgetConfig, ChartType } from '@/components/dashboard/widget-system/types'

function useBrandColorTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const h = () => setTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, h)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, h)
  }, [])
  return tick
}

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
type OverviewData = Record<string, any>

const TAB = 'overview'

export function OverviewView({ workspaceId, connectionId, editMode = false, onEditModeChange, dateFrom, dateTo, datePeriod }: Props) {
  const [data, setData]     = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)
  useBrandColorTick()

  const wc = useWidgetConfigs(workspaceId, TAB)

  // Local ordering state for drag — only built-in widgets participate in DnD
  const builtinConfigs = wc.configs.filter(c => c.type === 'builtin')
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  useEffect(() => {
    setOrderedIds(builtinConfigs.map(c => c.widgetId))
  }, [wc.configs])

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    const src = connectionId ? `&connectionId=${connectionId}` : ''
    const df = dateFrom ? `&from=${dateFrom}` : ''
    const dt = dateTo ? `&to=${dateTo}` : ''
    const dp = datePeriod ? `&period=${datePeriod}` : ''
    fetch(`/api/data/overview?workspaceId=${workspaceId}${src}${df}${dt}${dp}`)
      .then(r => r.json())
      .then(d => { if (d.hasData) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId, connectionId, dateFrom, dateTo, datePeriod])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedIds.indexOf(String(active.id))
    const newIndex = orderedIds.indexOf(String(over.id))
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex)
    setOrderedIds(newOrder)
  }

  async function handleDone() {
    // Save new order — built-in widgets first, then append SQL widgets
    const reorderedBuiltins = orderedIds
      .map(wid => builtinConfigs.find(c => c.widgetId === wid))
      .filter(Boolean) as WidgetConfig[]
    await wc.saveOrder([...reorderedBuiltins, ...sqlWidgets])
    onEditModeChange?.(false)
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const executiveMetrics          = data?.executiveMetrics          ?? []
  const weeklySpendMovement       = data?.weeklySpendMovement       ?? []
  const spendShareTrend           = data?.spendShareTrend           ?? []
  const weeklyMovementMetrics     = data?.weeklyMovementMetrics     ?? []
  const newVsExistingByAdvertiser = data?.newVsExistingByAdvertiser ?? []
  const newAdsTrend               = data?.newAdsTrend               ?? []
  const performanceTrend          = data?.performanceTrend          ?? []
  const weeklyMovementTable       = data?.table                     ?? []
  const activeBrands: string[]    = data?.brands     ?? []
  const brandNames: Record<string, string> = data?.brandNames ?? {}
  const ownBrandLabel: string     = data?.ownBrandLabel ?? 'Brand'

  if (loading) {
    return (
      <div>
        <SectionHeader title="Market Overview" description="Executive KPIs, spend movement, and weekly market activity" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
          {[1,2].map(i => <div key={i} className="h-64 bg-zinc-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  const sqlWidgets = wc.configs.filter(c => c.type === 'sql')

  // ── Render helpers ──────────────────────────────────────────────────────────
  function W({ id, colSpan, children }: { id: string; colSpan?: 1 | 2; children: React.ReactNode }) {
    return (
      <WidgetWrapper
        widgetId={id}
        editMode={editMode}
        isVisible={wc.isVisible(id)}
        onToggle={() => wc.toggleVisible(id, wc.isVisible(id))}
        colSpan={colSpan}
      >
        {children}
      </WidgetWrapper>
    )
  }


  return (
    <div>
      <SectionHeader title="Market Overview" description="Executive KPIs, spend movement, and weekly market activity" />

      {editMode && (
        <EditModeBar
          tab={TAB}
          configs={wc.configs}
          onAddWidget={() => { setEditingWidget(null); setShowAddSheet(true) }}
          onDone={handleDone}
          onCancel={() => onEditModeChange?.(false)}
          saving={wc.saving}
        />
      )}

      {!data && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          No data yet — connect Snowflake and run a sync to populate this view.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={rectSortingStrategy}>

          {/* Row 1: Executive KPIs (full-width) */}
          <W id="kpis-executive" colSpan={2}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {executiveMetrics.map((m: { label: string; value: string; delta: string; direction: 'up' | 'down'; info?: string }) => (
                <KpiCard key={m.label} label={m.label} value={m.value} delta={m.delta} direction={m.direction} info={m.info} />
              ))}
            </div>
          </W>

          {/* Row 2: Spend charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
            <W id="chart-weekly-spend">
              <ChartCard title="Weekly Est. Spend Movement" height={260} info="Estimated weekly ad spend per competitor. Spot when rivals ramp up budgets so you can respond quickly.">
                <div style={{ width: '100%', height: '100%' }}>
                  {weeklySpendMovement.length === 0 ? <EmptyState label="No spend data" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklySpendMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                        <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtCurrency} />} />
                        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        {activeBrands.map((bKey, i) => (
                          <Bar key={bKey} dataKey={bKey} name={bKey === 'circleK' ? 'Circle K' : bKey.charAt(0).toUpperCase() + bKey.slice(1)} stackId="a" fill={getBrandColor(brandNames[bKey] ?? bKey, i)} radius={i === activeBrands.length - 1 ? [3,3,0,0] : undefined} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </W>

            <W id="chart-spend-share">
              <ChartCard title="Share of Weekly Est. Spend" height={260} info="Your share of total market ad spend over time. Rising share means you're gaining visibility; falling share means competitors are outspending you.">
                <div style={{ width: '100%', height: '100%' }}>
                  {spendShareTrend.length === 0 ? <EmptyState label="No spend data" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spendShareTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                        <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtPercent} />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        {activeBrands.map((bKey, i) => (
                          <Line key={bKey} type="monotone" dataKey={bKey} name={bKey === 'circleK' ? 'Circle K' : bKey.charAt(0).toUpperCase() + bKey.slice(1)} stroke={getBrandColor(brandNames[bKey] ?? bKey, i)} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </W>
          </div>

          {/* Weekly Movement subsection */}
          <SubSection label="Weekly Movement" />

          <W id="kpis-movement" colSpan={2}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {weeklyMovementMetrics.map((m: { label: string; value: string; subtitle?: string; delta: string; direction: 'up' | 'down'; info?: string }) => (
                <KpiCard key={m.label} label={m.label} value={m.value} subtitle={m.subtitle} delta={m.delta} direction={m.direction} info={m.info} />
              ))}
            </div>
          </W>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
            <W id="chart-new-vs-existing">
              <ChartCard title="New vs Existing Ads" height={280} info="How much each competitor is refreshing their creative. High new-ad % signals an active campaign push or creative testing phase.">
                <div style={{ width: '100%', height: '100%' }}>
                  {newVsExistingByAdvertiser.length === 0 ? <EmptyState label="No data" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={newVsExistingByAdvertiser} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid {...GRID_H} />
                        <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0,100]} />
                        <YAxis type="category" dataKey="advertiser" tick={TICK} tickLine={false} axisLine={false} width={64} />
                        <Tooltip content={(p) => <ChartTooltip {...p} fmt={fmtPercent} />} />
                        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar dataKey="newAdsPct" name="New" stackId="a" fill="#6366F1" />
                        <Bar dataKey="existingAdsPct" name="Existing" stackId="a" fill="#E2E8F0" radius={[0,3,3,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </W>

            <W id="chart-new-ads-trend">
              <ChartCard title="New Ads Trend" height={280} info="Volume of newly launched ads per competitor over time. Spikes reveal campaign launches — use this to benchmark your creative output cadence.">
                <div style={{ width: '100%', height: '100%' }}>
                  {newAdsTrend.length === 0 ? <EmptyState label="No data" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={newAdsTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                        <YAxis tick={TICK} tickLine={false} axisLine={false} />
                        <Tooltip content={(p) => <ChartTooltip {...p} />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        {activeBrands.map((bKey, i) => (
                          <Line key={bKey} type="monotone" dataKey={bKey} name={bKey === 'circleK' ? 'Circle K' : bKey.charAt(0).toUpperCase() + bKey.slice(1)} stroke={getBrandColor(brandNames[bKey] ?? bKey, i)} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </W>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
            <W id="chart-pi-trend">
              <ChartCard title="Performance Index Trend" height={280} info="Performance Index (PI) measures ad effectiveness on a 0–100 scale. Above 70 = high performer. Track how your brand compares to the market average over time.">
                <div style={{ width: '100%', height: '100%' }}>
                  {performanceTrend.length === 0 ? <EmptyState label="No PI data" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                        <YAxis tick={TICK} tickLine={false} axisLine={false} domain={['auto','auto']} />
                        <Tooltip content={(p) => <ChartTooltip {...p} />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Line type="monotone" dataKey="ownBrand" name={ownBrandLabel} stroke={getBrandColor(ownBrandLabel, 0)} strokeWidth={2.5} dot={false} activeDot={ACTIVE_DOT} />
                        <Line type="monotone" dataKey="market" name="Market avg." stroke="#94A3B8" strokeWidth={2} dot={false} strokeDasharray="4 3" activeDot={ACTIVE_DOT} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </W>

            <W id="table-weekly-movement">
              <div className="bg-white rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-semibold leading-tight mb-4">Weekly Movement Details</p>
                {weeklyMovementTable.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data available.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Advertiser</TableHead>
                        <TableHead className="text-xs">Platform</TableHead>
                        <TableHead className="text-xs text-right">Total Ads</TableHead>
                        <TableHead className="text-xs text-right">New Ads</TableHead>
                        <TableHead className="text-xs text-right">Est. Spend</TableHead>
                        <TableHead className="text-xs text-right">PI Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyMovementTable.map((row: { advertiser: string; platform: string; totalAds: number; newAds: number; weeklySpend: number; avgPi: number | null }) => (
                        <TableRow key={`${row.advertiser}-${row.platform}`}>
                          <TableCell className="text-xs font-medium">{row.advertiser}</TableCell>
                          <TableCell className="text-xs">{row.platform}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{row.totalAds}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{row.newAds}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">€{row.weeklySpend.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{row.avgPi ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </W>
          </div>

        </SortableContext>
      </DndContext>

      {/* SQL widgets — rendered outside DnD context in a simple grid */}
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

      {/* Add / Edit SQL widget sheet */}
      {showAddSheet && workspaceId && (
        <AddWidgetSheet
          workspaceId={workspaceId}
          tab={TAB}
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
