'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Play, ChevronDown, Table2, TrendingUp, BarChart2, PieChart, Hash, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ChartType, WidgetConfig } from './types'

const CHART_TYPES: { id: ChartType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'table',  label: 'Table',    icon: Table2,    description: 'Any columns → data grid' },
  { id: 'kpi',    label: 'KPI',      icon: Hash,      description: 'value, label, delta columns' },
  { id: 'bar',    label: 'Bar',      icon: BarChart2, description: 'col1 = X, rest = series' },
  { id: 'line',   label: 'Line',     icon: TrendingUp,description: 'col1 = X, rest = series' },
  { id: 'area',   label: 'Area',     icon: Activity,  description: 'col1 = X, rest = series' },
  { id: 'pie',    label: 'Pie',      icon: PieChart,  description: 'name, value columns' },
]

const EXAMPLE_QUERIES: { label: string; sql: string }[] = [
  {
    label: 'Total ads per brand',
    sql: `SELECT tb.name AS brand, COUNT(*) AS total_ads
FROM ads a
JOIN tracked_brands tb ON tb.id = a.brand_id
WHERE a.workspace_id = {{workspaceId}}
GROUP BY tb.name
ORDER BY total_ads DESC`,
  },
  {
    label: 'Weekly spend by brand',
    sql: `SELECT ase.week_start, tb.name AS brand,
  ROUND(SUM(ase.est_spend_eur)::numeric, 2) AS total_spend
FROM ad_spend_estimates ase
JOIN ads a ON a.id = ase.ad_id
JOIN tracked_brands tb ON tb.id = a.brand_id
WHERE a.workspace_id = {{workspaceId}}
GROUP BY ase.week_start, tb.name
ORDER BY ase.week_start DESC, total_spend DESC
LIMIT 50`,
  },
  {
    label: 'Funnel stage distribution',
    sql: `SELECT ae.funnel_stage AS name, COUNT(*) AS value
FROM ad_enrichments ae
JOIN ads a ON a.id = ae.ad_id
WHERE a.workspace_id = {{workspaceId}}
  AND ae.funnel_stage IS NOT NULL
GROUP BY ae.funnel_stage
ORDER BY value DESC`,
  },
  {
    label: 'Top PI score ads',
    sql: `SELECT tb.name AS brand,
  a.headline,
  a.performance_index AS pi_score,
  a.first_seen_at::date AS date
FROM ads a
JOIN tracked_brands tb ON tb.id = a.brand_id
WHERE a.workspace_id = {{workspaceId}}
  AND a.performance_index IS NOT NULL
ORDER BY a.performance_index DESC
LIMIT 20`,
  },
]

interface Props {
  workspaceId: string
  tab: string
  editingWidget?: WidgetConfig | null
  onSave: (params: { title: string; sqlQuery: string; chartType: ChartType; colSpan: 1 | 2 }) => Promise<void>
  onClose: () => void
}

export function AddWidgetSheet({ workspaceId, tab, editingWidget, onSave, onClose }: Props) {
  const [title, setTitle]         = useState(editingWidget?.title ?? '')
  const [sql, setSql]             = useState(editingWidget?.sqlQuery ?? '')
  const [chartType, setChartType] = useState<ChartType>((editingWidget?.chartType as ChartType) ?? 'table')
  const [colSpan, setColSpan]     = useState<1 | 2>(editingWidget?.colSpan ?? 2)
  const [previewing, setPreviewing] = useState(false)
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [showExamples, setShowExamples] = useState(false)

  useEffect(() => {
    if (editingWidget) {
      setTitle(editingWidget.title ?? '')
      setSql(editingWidget.sqlQuery ?? '')
      setChartType((editingWidget.chartType as ChartType) ?? 'table')
      setColSpan(editingWidget.colSpan ?? 2)
    }
  }, [editingWidget])

  async function handlePreview() {
    if (!sql.trim()) return
    setPreviewing(true)
    setPreviewError(null)
    setPreviewRows(null)
    const res = await fetch('/api/widgets/run-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, sql }),
    })
    const d = await res.json()
    if (d.error) setPreviewError(d.error)
    else setPreviewRows(d.rows ?? [])
    setPreviewing(false)
  }

  async function handleSave() {
    if (!title.trim() || !sql.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), sqlQuery: sql, chartType, colSpan })
    setSaving(false)
    onClose()
  }

  const cols = previewRows?.length ? Object.keys(previewRows[0]) : []

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[300] bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 z-[301] w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {editingWidget ? 'Edit Widget' : 'Add SQL Widget'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Write a SELECT query. Use <code className="font-mono bg-zinc-100 px-1 rounded">{'{{workspaceId}}'}</code> to scope to this workspace.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-100">
            <X className="size-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title + Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Widget title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Weekly spend by brand"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Width</Label>
              <div className="flex gap-2">
                {([1, 2] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setColSpan(n)}
                    className={cn(
                      'flex-1 h-8 text-xs rounded-md border font-medium transition-colors',
                      colSpan === n
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-border hover:border-zinc-400'
                    )}
                  >
                    {n === 1 ? 'Half width' : 'Full width'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart type */}
          <div className="space-y-2">
            <Label className="text-xs">Chart type</Label>
            <div className="grid grid-cols-3 gap-2">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setChartType(ct.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors',
                    chartType === ct.id
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white border-border hover:border-zinc-400 text-zinc-700'
                  )}
                >
                  <ct.icon className="size-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{ct.label}</p>
                    <p className={cn('text-[10px] truncate', chartType === ct.id ? 'text-zinc-300' : 'text-muted-foreground')}>
                      {ct.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SQL editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">SQL Query</Label>
              <button
                onClick={() => setShowExamples(v => !v)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Examples
                <ChevronDown className={cn('size-3 transition-transform', showExamples && 'rotate-180')} />
              </button>
            </div>

            {showExamples && (
              <div className="rounded-lg border border-border bg-zinc-50 p-3 space-y-1.5">
                {EXAMPLE_QUERIES.map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => { setSql(ex.sql); setShowExamples(false) }}
                    className="w-full text-left text-xs px-3 py-2 rounded-md hover:bg-white border border-transparent hover:border-border transition-colors font-medium text-zinc-700"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={sql}
              onChange={e => setSql(e.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={`SELECT tb.name AS brand, COUNT(*) AS total_ads
FROM ads a
JOIN tracked_brands tb ON tb.id = a.brand_id
WHERE a.workspace_id = {{workspaceId}}
GROUP BY tb.name
ORDER BY total_ads DESC`}
              className="w-full font-mono text-xs rounded-lg border border-border bg-zinc-950 text-zinc-100 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-700 placeholder:text-zinc-600"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handlePreview}
                disabled={!sql.trim() || previewing}
              >
                {previewing
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Play className="size-3.5" />
                }
                Run preview
              </Button>
              {previewRows && (
                <span className="text-xs text-muted-foreground self-center">
                  {previewRows.length} row{previewRows.length !== 1 ? 's' : ''} · {cols.length} column{cols.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Preview result */}
          {previewError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-mono">
              {previewError}
            </div>
          )}

          {previewRows && previewRows.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-zinc-50 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                Preview — first {Math.min(previewRows.length, 8)} rows
              </div>
              <div className="overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {cols.map(c => (
                        <th key={c} className="text-left px-4 py-2 font-semibold text-muted-foreground whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {cols.map(c => (
                          <td key={c} className="px-4 py-2 tabular-nums whitespace-nowrap">
                            {row[c] === null || row[c] === undefined ? <span className="text-zinc-300">null</span> : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-white">
          <p className="text-xs text-muted-foreground">
            Tab: <span className="font-medium capitalize text-foreground">{tab}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!title.trim() || !sql.trim() || saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : (editingWidget ? 'Save changes' : 'Add widget')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
