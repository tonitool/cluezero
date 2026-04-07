'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, LineChart, PieChart, ScatterChart, Layers, Save, Loader2, Plus, Check } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { ChartRenderer, DataPoint } from '@/components/dashboard/_components/chart-renderer'
import { METRICS, DIMENSIONS, CHART_TYPES, fmtValue } from '@/lib/metrics'
import { cn } from '@/lib/utils'

const CHART_ICONS: Record<string, React.ElementType> = {
  bar:     BarChart3,
  line:    LineChart,
  area:    Layers,
  scatter: ScatterChart,
  pie:     PieChart,
}

const WEEK_OPTIONS = [
  { value: 2,  label: '2 weeks' },
  { value: 4,  label: '4 weeks' },
  { value: 8,  label: '8 weeks' },
  { value: 12, label: '12 weeks' },
]

interface Props {
  workspaceId?:  string
  connectionId?: string
  onNavigate?:   (view: string) => void
}

export function ExploreView({ workspaceId, connectionId, onNavigate }: Props) {
  const [metricA,    setMetricA]    = useState('spend')
  const [metricB,    setMetricB]    = useState<string>('none')
  const [dimension,  setDimension]  = useState('brand')
  const [chartType,  setChartType]  = useState('bar')
  const [weekRange,  setWeekRange]  = useState(4)
  const [data,       setData]       = useState<DataPoint[]>([])
  const [loading,    setLoading]    = useState(false)
  const [saveState,  setSaveState]  = useState<'idle' | 'saving' | 'saved'>('idle')
  const [tileTitle,  setTileTitle]  = useState('')
  const [showSavePanel, setShowSavePanel] = useState(false)

  // Auto-adjust chart type when metricB is selected
  useEffect(() => {
    if (metricB !== 'none' && chartType === 'pie') setChartType('bar')
    if (metricB !== 'none' && chartType === 'scatter') return // fine
    if (metricB === 'none' && chartType === 'scatter') setChartType('bar')
  }, [metricB, chartType])

  // Auto-adjust chart for time dimension
  useEffect(() => {
    if (dimension === 'week' && chartType === 'pie') setChartType('line')
  }, [dimension, chartType])

  const fetchData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch('/api/data/explore', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          metricA,
          metricB: metricB !== 'none' ? metricB : undefined,
          dimension,
          weekRange,
          connectionId,
        }),
      })
      const json = await res.json()
      setData(json.data ?? [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [workspaceId, metricA, metricB, dimension, weekRange, connectionId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!workspaceId || !tileTitle.trim()) return
    setSaveState('saving')
    await fetch('/api/dashboard/tiles', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        title:     tileTitle,
        metricA,
        metricB:   metricB !== 'none' ? metricB : undefined,
        dimension,
        chartType,
        weekRange,
      }),
    })
    setSaveState('saved')
    setTimeout(() => {
      setSaveState('idle')
      setShowSavePanel(false)
      setTileTitle('')
    }, 1500)
  }

  const activeMetricB = metricB !== 'none' ? metricB : undefined

  // Stat cards above chart
  const topStat = data[0]
  const total   = data.reduce((s, d) => s + d.metricA, 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <SectionHeader
          title="Explore"
          description="Pick any metrics and dimensions to build a custom visualisation"
        />
        <Button
          size="sm" className="h-8 gap-1.5 text-xs shrink-0 mt-1"
          onClick={() => setShowSavePanel(v => !v)}
        >
          <Save className="size-3.5" />
          Save to Dashboard
        </Button>
      </div>

      {/* Save panel */}
      {showSavePanel && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 mb-5 flex items-center gap-3">
          <input
            value={tileTitle}
            onChange={e => setTileTitle(e.target.value)}
            placeholder="Chart title…"
            className="flex-1 h-8 text-sm rounded-lg border border-border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave}
            disabled={!tileTitle.trim() || saveState !== 'idle'}>
            {saveState === 'saving' ? <Loader2 className="size-3.5 animate-spin" /> :
             saveState === 'saved'  ? <Check className="size-3.5" /> :
             <Plus className="size-3.5" />}
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved!' : 'Add tile'}
          </Button>
        </div>
      )}

      {/* Config bar */}
      <div className="bg-white border border-border rounded-xl shadow-sm px-5 py-4 mb-5 flex flex-wrap items-center gap-3">
        {/* Metric A */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Metric</label>
          <select value={metricA} onChange={e => setMetricA(e.target.value)}
            className="h-8 text-sm rounded-lg border border-border px-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring">
            {Object.entries(METRICS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-medium self-end mb-1.5">vs</div>

        {/* Metric B */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compare with</label>
          <select value={metricB} onChange={e => setMetricB(e.target.value)}
            className="h-8 text-sm rounded-lg border border-border px-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="none">None</option>
            {Object.entries(METRICS).filter(([k]) => k !== metricA).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-8 bg-border self-end mb-0.5" />

        {/* Dimension */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Group by</label>
          <select value={dimension} onChange={e => setDimension(e.target.value)}
            className="h-8 text-sm rounded-lg border border-border px-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring">
            {Object.entries(DIMENSIONS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Week range */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
          <select value={weekRange} onChange={e => setWeekRange(Number(e.target.value))}
            className="h-8 text-sm rounded-lg border border-border px-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring">
            {WEEK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="w-px h-8 bg-border self-end mb-0.5" />

        {/* Chart type */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chart</label>
          <div className="flex gap-1">
            {CHART_TYPES
              .filter(ct => !ct.requiresB || activeMetricB)
              .map(ct => {
                const Icon = CHART_ICONS[ct.id]
                return (
                  <button key={ct.id} onClick={() => setChartType(ct.id)}
                    title={ct.label}
                    className={cn(
                      'size-8 flex items-center justify-center rounded-lg border transition-colors',
                      chartType === ct.id
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-border text-muted-foreground hover:border-zinc-400 hover:text-foreground'
                    )}>
                    <Icon className="size-3.5" />
                  </button>
                )
              })}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Total {METRICS[metricA]?.label}</p>
            <p className="text-lg font-bold mt-0.5">{fmtValue(total, metricA)}</p>
          </div>
          {topStat && (
            <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Top {DIMENSIONS[dimension]?.label}</p>
              <p className="text-lg font-bold mt-0.5 truncate">{topStat.name}</p>
            </div>
          )}
          <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Data points</p>
            <p className="text-lg font-bold mt-0.5">{data.length}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold">
              {METRICS[metricA]?.label}
              {activeMetricB && ` vs ${METRICS[activeMetricB]?.label}`}
              {' by '}
              {DIMENSIONS[dimension]?.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Last {weekRange} weeks</p>
          </div>
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <ChartRenderer
          data={data}
          chartType={chartType}
          metricA={metricA}
          metricB={activeMetricB}
          height={360}
        />
      </div>
    </div>
  )
}
