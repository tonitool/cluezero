export interface MetricDef {
  label:  string
  unit?:  string
  format: 'currency' | 'number' | 'percent'
  color:  string
}

export interface DimensionDef {
  label: string
}

export interface ChartTypeDef {
  id:         string
  label:      string
  requiresB:  boolean  // needs metricB
  timeOnly:   boolean  // only makes sense for time dimension
}

export const METRICS: Record<string, MetricDef> = {
  spend:       { label: 'Ad Spend',          unit: '€', format: 'currency', color: '#6366f1' },
  pi:          { label: 'Performance Index',             format: 'number',   color: '#f59e0b' },
  reach:       { label: 'Reach',                         format: 'number',   color: '#10b981' },
  impressions: { label: 'Impressions',                   format: 'number',   color: '#3b82f6' },
  ad_count:    { label: 'Active Ads',                    format: 'number',   color: '#8b5cf6' },
  new_ads:     { label: 'New Ads',                       format: 'number',   color: '#ec4899' },
}

export const DIMENSIONS: Record<string, DimensionDef> = {
  brand:    { label: 'Brand' },
  week:     { label: 'Week' },
  platform: { label: 'Platform' },
  funnel:   { label: 'Funnel Stage' },
  topic:    { label: 'Topic' },
}

export const CHART_TYPES: ChartTypeDef[] = [
  { id: 'bar',     label: 'Bar',     requiresB: false, timeOnly: false },
  { id: 'line',    label: 'Line',    requiresB: false, timeOnly: false },
  { id: 'area',    label: 'Area',    requiresB: false, timeOnly: false },
  { id: 'scatter', label: 'Scatter', requiresB: true,  timeOnly: false },
  { id: 'pie',     label: 'Pie',     requiresB: false, timeOnly: false },
]

export function fmtValue(value: number, metric: string): string {
  const def = METRICS[metric]
  if (!def) return String(value)
  if (def.format === 'currency') {
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000)     return `€${(value / 1_000).toFixed(0)}k`
    return `€${value}`
  }
  if (def.format === 'percent') return `${value}%`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}k`
  return String(value)
}
