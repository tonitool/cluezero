export type ChartType = 'table' | 'kpi' | 'bar' | 'line' | 'area' | 'pie'
export type WidgetType = 'builtin' | 'sql'

export interface WidgetConfig {
  id: string             // DB row id
  workspaceId: string
  tab: string
  widgetId: string       // built-in key or uuid
  type: WidgetType
  title: string | null
  sqlQuery: string | null
  chartType: ChartType | null
  colSpan: 1 | 2
  position: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

// Canonical list of built-in widget IDs per tab
export const BUILTIN_WIDGETS: Record<string, { id: string; defaultTitle: string; defaultColSpan: 1 | 2 }[]> = {
  overview: [
    { id: 'kpis-executive',        defaultTitle: 'Executive KPIs',            defaultColSpan: 2 },
    { id: 'chart-weekly-spend',    defaultTitle: 'Weekly Est. Spend Movement', defaultColSpan: 1 },
    { id: 'chart-spend-share',     defaultTitle: 'Share of Weekly Est. Spend', defaultColSpan: 1 },
    { id: 'kpis-movement',         defaultTitle: 'Weekly Movement KPIs',       defaultColSpan: 2 },
    { id: 'chart-new-vs-existing', defaultTitle: 'New vs Existing Ads',        defaultColSpan: 1 },
    { id: 'chart-new-ads-trend',   defaultTitle: 'New Ads Trend',              defaultColSpan: 1 },
    { id: 'chart-pi-trend',        defaultTitle: 'Performance Index Trend',    defaultColSpan: 1 },
    { id: 'table-weekly-movement', defaultTitle: 'Weekly Movement Details',    defaultColSpan: 1 },
  ],
  movement: [
    { id: 'chart-spend-by-brand',   defaultTitle: 'Spend by Brand',           defaultColSpan: 2 },
    { id: 'chart-reach-trend',      defaultTitle: 'Reach Trend',              defaultColSpan: 1 },
    { id: 'chart-new-ads-movement', defaultTitle: 'New Ads by Brand',         defaultColSpan: 1 },
    { id: 'table-movement-detail',  defaultTitle: 'Movement Detail Table',    defaultColSpan: 2 },
  ],
  competitive: [
    { id: 'chart-competitive-share', defaultTitle: 'Competitive Share',       defaultColSpan: 2 },
    { id: 'chart-brand-vs-market',   defaultTitle: 'Brand vs Market',         defaultColSpan: 1 },
    { id: 'table-competitive',       defaultTitle: 'Competitive Table',       defaultColSpan: 1 },
  ],
  performance: [
    { id: 'kpis-performance',        defaultTitle: 'Performance KPIs',        defaultColSpan: 2 },
    { id: 'chart-funnel-dist',       defaultTitle: 'Funnel Distribution',     defaultColSpan: 1 },
    { id: 'chart-funnel-advertiser', defaultTitle: 'Funnel by Advertiser',    defaultColSpan: 1 },
    { id: 'chart-new-ads-funnel',    defaultTitle: 'New Ads by Funnel',       defaultColSpan: 2 },
  ],
  brand: [
    { id: 'kpis-brand',              defaultTitle: 'Brand KPIs',              defaultColSpan: 2 },
    { id: 'chart-brand-spend',       defaultTitle: 'Brand Spend Trend',       defaultColSpan: 1 },
    { id: 'chart-brand-creatives',   defaultTitle: 'Brand Creatives',         defaultColSpan: 1 },
  ],
  creative: [
    { id: 'grid-creatives',          defaultTitle: 'Creative Grid',           defaultColSpan: 2 },
  ],
}
