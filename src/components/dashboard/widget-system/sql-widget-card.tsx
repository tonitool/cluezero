'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Loader2, AlertCircle, RefreshCcw, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChartType, WidgetConfig } from './types'

const COLORS = ['#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']

interface Props {
  config: WidgetConfig
  workspaceId: string
  editMode: boolean
  onEdit: () => void
  onDelete: () => void
}

type Row = Record<string, unknown>

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2)
  return String(v)
}

export function SqlWidgetCard({ config, workspaceId, editMode, onEdit, onDelete }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(() => {
    if (!config.sqlQuery) return
    setLoading(true)
    setError(null)
    fetch('/api/widgets/run-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, sql: config.sqlQuery }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setRows(d.rows ?? [])
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [config.sqlQuery, workspaceId])

  useEffect(() => { run() }, [run])

  const title = config.title ?? 'SQL Widget'
  const chartType: ChartType = (config.chartType as ChartType) ?? 'table'

  return (
    <div className={cn(
      'bg-white rounded-xl border border-border shadow-sm overflow-hidden',
      'transition-shadow hover:shadow-md',
      config.colSpan === 2 ? 'col-span-2' : 'col-span-1',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded shrink-0">SQL</span>
          <p className="text-sm font-semibold leading-tight truncate">{title}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={run} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-zinc-50 transition-colors" title="Refresh">
            <RefreshCcw className={cn('size-3.5', loading && 'animate-spin')} />
          </button>
          {editMode && (
            <>
              <button onClick={onEdit} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-zinc-50 transition-colors" title="Edit widget">
                <Pencil className="size-3.5" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete widget">
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {loading && (
          <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Running query…
          </div>
        )}
        {!loading && error && (
          <div className="flex items-start gap-2 py-4 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3">
            <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No rows returned.</p>
        )}
        {!loading && !error && rows.length > 0 && (
          <RenderChart rows={rows} chartType={chartType} />
        )}
      </div>
    </div>
  )
}

function RenderChart({ rows, chartType }: { rows: Row[]; chartType: ChartType }) {
  const cols = Object.keys(rows[0] ?? {})

  // ── KPI ──────────────────────────────────────────────────────────────────────
  if (chartType === 'kpi') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {rows.slice(0, 6).map((row, i) => {
          const label = String(row.label ?? cols[0] ?? `Metric ${i + 1}`)
          const value = fmtVal(row.value ?? Object.values(row)[0])
          const delta = row.delta != null ? String(row.delta) : null
          return (
            <div key={i} className="bg-zinc-50 rounded-lg px-4 py-3 border border-border">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
              {delta && <p className="text-xs text-muted-foreground mt-0.5">{delta}</p>}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Table ─────────────────────────────────────────────────────────────────────
  if (chartType === 'table') {
    return (
      <div className="overflow-auto max-h-72">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {cols.map(c => (
                <th key={c} className="text-left font-semibold text-muted-foreground py-2 pr-4 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/60 hover:bg-zinc-50/60">
                {cols.map(c => (
                  <td key={c} className="py-2 pr-4 tabular-nums whitespace-nowrap">{fmtVal(row[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Pie ───────────────────────────────────────────────────────────────────────
  if (chartType === 'pie') {
    const nameCol  = cols.find(c => c === 'name' || c === 'label') ?? cols[0]
    const valueCol = cols.find(c => c === 'value' || c === 'count' || c === 'total') ?? cols[1] ?? cols[0]
    const pieData  = rows.map(r => ({ name: String(r[nameCol] ?? ''), value: Number(r[valueCol] ?? 0) }))
    return (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={60} outerRadius={90} paddingAngle={2}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => Number(v).toLocaleString()} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // ── Bar / Line / Area (first col = X, remaining = Y series) ──────────────────
  const xCol    = cols[0]
  const yCols   = cols.slice(1).length > 0 ? cols.slice(1) : [cols[0]]
  const chartData = rows.map(r => {
    const point: Record<string, unknown> = { name: String(r[xCol] ?? '') }
    for (const y of yCols) point[y] = Number(r[y] ?? 0)
    return point
  })

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip />
          {yCols.length > 1 && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
          {yCols.map((y, i) => (
            <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {yCols.map((y, i) => (
              <linearGradient key={y} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.15} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip />
          {yCols.length > 1 && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
          {yCols.map((y, i) => (
            <Area key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]}
              fill={`url(#grad-${i})`} strokeWidth={2} dot={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // Line (default)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <Tooltip />
        {yCols.length > 1 && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
        {yCols.map((y, i) => (
          <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]}
            strokeWidth={2.5} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
