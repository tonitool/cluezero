'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ZAxis,
} from 'recharts'
import { METRICS, fmtValue } from '@/lib/metrics'
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'

export interface DataPoint {
  name:     string
  metricA:  number
  metricB?: number
}

interface Props {
  data:       DataPoint[]
  chartType:  string
  metricA:    string
  metricB?:   string
  height?:    number
  dark?:      boolean
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, metricA, metricB, dark }: {
  active?: boolean; payload?: { value: number; name: string }[]; label?: string
  metricA: string; metricB?: string; dark?: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={dark ? { background: '#0f1018', border: '1px solid #2d3154', color: '#e4e6f0' } : undefined}
      className={dark
        ? 'rounded-xl shadow-xl px-3 py-2.5 text-xs space-y-1'
        : 'bg-white border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-1'}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => {
        const color = getBrandColor(label ?? '', i)
        return (
          <p key={i} style={{ color }}>
            {p.name === 'metricA' ? METRICS[metricA]?.label : METRICS[metricB ?? '']?.label}:{' '}
            <strong>{fmtValue(p.value, p.name === 'metricA' ? metricA : (metricB ?? ''))}</strong>
          </p>
        )
      })}
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function ChartRenderer({ data, chartType, metricA, metricB, height = 300, dark = false }: Props) {
  // Re-render when brand colors are updated in Setup
  const [, setTick] = useState(0)
  useEffect(() => {
    const handler = () => setTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, handler)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, handler)
  }, [])

  // colorA/B drive line / area strokes (first two brands in palette order)
  const colorA = getBrandColor('__first__',  0)
  const colorB = getBrandColor('__second__', 1)

  const axisFill  = dark ? '#4a4f6a' : '#94a3b8'
  const gridStroke= dark ? '#1e2235' : '#f1f5f9'
  const axisStyle = { fontSize: 10, fill: axisFill }
  const gridProps = { strokeDasharray: '3 3', stroke: gridStroke, vertical: false }
  const tooltip   = <CustomTooltip metricA={metricA} metricB={metricB} dark={dark} />

  if (!data.length) {
    return (
      <div style={{ height, color: axisFill }} className="flex items-center justify-center text-xs">
        No data for this configuration
      </div>
    )
  }

  // ── Scatter ──────────────────────────────────────────────────────────────────
  if (chartType === 'scatter' && metricB) {
    const scatterData = data.map(d => ({ x: d.metricA, y: d.metricB ?? 0, name: d.name }))
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="x" type="number" name={METRICS[metricA]?.label} tick={axisStyle}
            tickFormatter={v => fmtValue(v, metricA)}
            label={{ value: METRICS[metricA]?.label, position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: axisFill } }} />
          <YAxis dataKey="y" type="number" name={METRICS[metricB]?.label} tick={axisStyle}
            tickFormatter={v => fmtValue(v, metricB)} />
          <ZAxis range={[60, 60]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              const c = getBrandColor(d.name, 0)
              return (
                <div style={dark ? { background: '#0f1018', border: '1px solid #2d3154', color: '#e4e6f0' } : undefined}
                  className={dark ? 'rounded-xl shadow-xl px-3 py-2.5 text-xs space-y-1' : 'bg-white border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-1'}>
                  <p className="font-semibold">{d.name}</p>
                  <p style={{ color: c }}>{METRICS[metricA]?.label}: <strong>{fmtValue(d.x, metricA)}</strong></p>
                  <p style={{ color: c }}>{METRICS[metricB ?? '']?.label}: <strong>{fmtValue(d.y, metricB ?? '')}</strong></p>
                </div>
              )
            }}
          />
          <Scatter data={scatterData} fill={colorA}>
            {scatterData.map((d, i) => <Cell key={i} fill={getBrandColor(d.name, i)} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  // ── Pie ───────────────────────────────────────────────────────────────────────
  // NOTE: do NOT put `fill` in the `style` prop on <Pie> — SVG fill cascades
  // to all child <path> elements and overrides Cell fills.
  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="metricA"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={height * 0.2}
            outerRadius={height * 0.38}
            paddingAngle={2}
            labelLine={false}
            label={({ name, percent, x, y }: { name?: string; percent?: number; x: number; y: number }) => (
              <text x={x} y={y} fill={axisFill} fontSize={10} textAnchor="middle" dominantBaseline="central">
                {`${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
              </text>
            )}
          >
            {data.map((d, i) => <Cell key={i} fill={getBrandColor(d.name, i)} />)}
          </Pie>
          <Tooltip formatter={(v) => fmtValue(Number(Array.isArray(v) ? v[0] : (v ?? 0)), metricA)} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // ── Bar ───────────────────────────────────────────────────────────────────────
  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }} barCategoryGap="30%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis yAxisId="a" tick={axisStyle} tickFormatter={v => fmtValue(v, metricA)} width={52} />
          {metricB && <YAxis yAxisId="b" orientation="right" tick={axisStyle} tickFormatter={v => fmtValue(v, metricB)} width={52} />}
          <Tooltip content={tooltip} />
          {metricB && (
            <Legend
              formatter={(v) => v === 'metricA' ? METRICS[metricA]?.label : METRICS[metricB ?? '']?.label}
              wrapperStyle={{ color: axisFill, fontSize: 10 }}
            />
          )}
          {/* Per-brand Cell coloring on metricA bars */}
          <Bar yAxisId="a" dataKey="metricA" radius={[4, 4, 0, 0]} maxBarSize={48} fill={colorA}>
            {data.map((d, i) => <Cell key={i} fill={getBrandColor(d.name, i)} />)}
          </Bar>
          {metricB && (
            <Bar yAxisId="b" dataKey="metricB" radius={[4, 4, 0, 0]} maxBarSize={48} fill={colorB}>
              {data.map((d, i) => <Cell key={i} fill={getBrandColor(d.name, i)} fillOpacity={0.55} />)}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // ── Area ─────────────────────────────────────────────────────────────────────
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colorA} stopOpacity={dark ? 0.25 : 0.15} />
              <stop offset="95%" stopColor={colorA} stopOpacity={0} />
            </linearGradient>
            {metricB && (
              <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colorB} stopOpacity={dark ? 0.25 : 0.15} />
                <stop offset="95%" stopColor={colorB} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis yAxisId="a" tick={axisStyle} tickFormatter={v => fmtValue(v, metricA)} width={52} />
          {metricB && <YAxis yAxisId="b" orientation="right" tick={axisStyle} tickFormatter={v => fmtValue(v, metricB)} width={52} />}
          <Tooltip content={tooltip} />
          {metricB && (
            <Legend
              formatter={(v) => v === 'metricA' ? METRICS[metricA]?.label : METRICS[metricB ?? '']?.label}
              wrapperStyle={{ color: axisFill, fontSize: 10 }}
            />
          )}
          <Area yAxisId="a" type="monotone" dataKey="metricA" stroke={colorA} strokeWidth={2} fill="url(#gradA)" />
          {metricB && <Area yAxisId="b" type="monotone" dataKey="metricB" stroke={colorB} strokeWidth={2} fill="url(#gradB)" />}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // ── Line (default) ────────────────────────────────────────────────────────────
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="name" tick={axisStyle} />
        <YAxis yAxisId="a" tick={axisStyle} tickFormatter={v => fmtValue(v, metricA)} width={52} />
        {metricB && <YAxis yAxisId="b" orientation="right" tick={axisStyle} tickFormatter={v => fmtValue(v, metricB)} width={52} />}
        <Tooltip content={tooltip} />
        {metricB && (
          <Legend
            formatter={(v) => v === 'metricA' ? METRICS[metricA]?.label : METRICS[metricB ?? '']?.label}
            wrapperStyle={{ color: axisFill, fontSize: 10 }}
          />
        )}
        <Line yAxisId="a" type="monotone" dataKey="metricA" stroke={colorA} strokeWidth={2.5} dot={{ fill: colorA, r: 3 }} />
        {metricB && <Line yAxisId="b" type="monotone" dataKey="metricB" stroke={colorB} strokeWidth={2.5} dot={{ fill: colorB, r: 3 }} />}
      </LineChart>
    </ResponsiveContainer>
  )
}
