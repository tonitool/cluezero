// ─── Shared chart theme ───────────────────────────────────────────────────────
// Single source of truth for tooltip styling, axis/grid props, and active-dot
// shape across every Recharts chart in the dashboard.

// ─── Custom tooltip ────────────────────────────────────────────────────────────
interface ChartTooltipProps {
  // Recharts injects these when used as tooltip content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[]
  label?: string | number
  /** Optional value formatter — falls back to toLocaleString */
  fmt?: (value: number, name: string) => string
}

export function ChartTooltip({ active, payload, label, fmt }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-zinc-900/95 border border-zinc-700/50 px-3 py-2.5 shadow-2xl text-xs min-w-[140px] pointer-events-none">
      {label != null && label !== '' && (
        <p className="text-zinc-400 font-medium pb-1.5 mb-2 border-b border-zinc-800">{label}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-zinc-300 truncate max-w-[120px]">{entry.name}</span>
            <span className="text-white font-semibold ml-auto pl-3 tabular-nums">
              {fmt
                ? fmt(Number(entry.value), String(entry.name))
                : Number(entry.value ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Common value formatters ───────────────────────────────────────────────────
export const fmtCurrency = (v: number) => `€${v.toLocaleString()}`
export const fmtPercent  = (v: number) => `${v}%`
export const fmtNumber   = (v: number) => v.toLocaleString()

// ─── Axis tick style ───────────────────────────────────────────────────────────
/** Apply via tick={TICK} on XAxis / YAxis */
export const TICK = { fontSize: 11, fill: '#71717a' } as const

// ─── CartesianGrid presets ─────────────────────────────────────────────────────
/** Standard charts (line / vertical bar): horizontal guide lines only */
export const GRID = {
  strokeDasharray: '3 3',
  stroke: '#f4f4f5',
  vertical: false,
} as const

/** Horizontal bar charts (layout="vertical"): vertical guide lines only */
export const GRID_H = {
  strokeDasharray: '3 3',
  stroke: '#f4f4f5',
  horizontal: false,
} as const

// ─── Active dot for Line charts ────────────────────────────────────────────────
/** Pass as activeDot={ACTIVE_DOT} — clean filled circle, no extra ring */
export const ACTIVE_DOT = { r: 4, strokeWidth: 0 } as const
