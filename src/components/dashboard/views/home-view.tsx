'use client'

import { useState, useRef } from 'react'
import {
  ArrowRight,
  Sparkles,
  ImageIcon,
  BarChart3,
  Users,
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  X,
  Search,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { KpiCard } from '@/components/dashboard/_components/kpi-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  executiveMetrics,
  weeklySpendMovement,
  performanceIndexRanking,
  creativeLibrary,
} from '@/components/dashboard/mock-data'
import { BRAND_COLORS } from '@/components/dashboard/_components/constants'
import { cn } from '@/lib/utils'

type ViewId =
  | 'overview' | 'competitive' | 'performance' | 'orlen'
  | 'ai' | 'creative-library' | 'alerts' | 'connections' | 'setup'

interface Props {
  workspaceName: string
  onNavigate: (view: ViewId) => void
}

// ─── Auto-insights ────────────────────────────────────────────────────────────

const AUTO_INSIGHTS = [
  {
    type: 'warning' as const,
    icon: AlertTriangle,
    title: 'Shell spend surge detected',
    body: 'Shell increased estimated weekly spend by +28% — 8 new Google Do-stage ads launched.',
    action: 'View Competitive Intelligence',
    view: 'competitive' as ViewId,
  },
  {
    type: 'success' as const,
    icon: CheckCircle2,
    title: 'ORLEN share up +1.1 pts',
    body: 'ORLEN holds 13.7% share of estimated weekly market spend, the highest in 4 weeks.',
    action: 'View Market Overview',
    view: 'overview' as ViewId,
  },
  {
    type: 'info' as const,
    icon: TrendingUp,
    title: 'New high-PI creative from Aral',
    body: 'Aral\'s "Summer Road Trip" Meta ad scored PI 73 — highest new entry this week.',
    action: 'Browse Creative Library',
    view: 'creative-library' as ViewId,
  },
]

// ─── Explore shortcuts ────────────────────────────────────────────────────────

const EXPLORE_SHORTCUTS = [
  {
    id: 'overview' as ViewId,
    icon: LayoutDashboard,
    label: 'Market Overview',
    description: 'KPIs, spend movement, weekly market trends',
    color: '#6366F1',
  },
  {
    id: 'competitive' as ViewId,
    icon: Users,
    label: 'Competitive Intelligence',
    description: 'Advertiser, topic, and audience benchmarks',
    color: '#0EA5E9',
  },
  {
    id: 'creative-library' as ViewId,
    icon: ImageIcon,
    label: 'Creative Library',
    description: '25 competitor ads — filter, sort, analyse',
    color: '#10B981',
  },
  {
    id: 'orlen' as ViewId,
    icon: Sparkles,
    label: 'ORLEN Deep Dive',
    description: 'Brand scorecard vs market opportunities',
    color: '#18181b',
  },
]

// ─── AI Smart Filter ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Shell spend on Meta this week',
  'ORLEN vs Aral creative performance',
  'Top Do-stage ads',
  'Which brand is most active on LinkedIn?',
  'Whitespace opportunities for ORLEN',
]

type SmartWidget =
  | { type: 'spend-chart'; title: string }
  | { type: 'pi-ranking'; title: string }
  | { type: 'creatives'; title: string; brand?: string; platform?: string }
  | { type: 'insight-text'; title: string; body: string }

function resolveWidgets(query: string): SmartWidget[] {
  const q = query.toLowerCase()
  const widgets: SmartWidget[] = []

  if (q.includes('spend') || q.includes('budget') || q.includes('market')) {
    widgets.push({ type: 'spend-chart', title: 'Weekly Estimated Spend by Brand' })
  }
  if (q.includes('performance') || q.includes('pi') || q.includes('ranking') || q.includes('score')) {
    widgets.push({ type: 'pi-ranking', title: 'Performance Index Ranking' })
  }
  if (q.includes('creative') || q.includes('ad') || q.includes('format')) {
    const brand = ['shell', 'aral', 'orlen', 'eni', 'esso', 'circle k'].find(b => q.includes(b))
    const platform = ['meta', 'google', 'linkedin'].find(p => q.includes(p))
    widgets.push({
      type: 'creatives',
      title: `${brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Top'} Creatives${platform ? ` on ${platform.charAt(0).toUpperCase() + platform.slice(1)}` : ''}`,
      brand: brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : undefined,
      platform: platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : undefined,
    })
  }
  if (q.includes('whitespace') || q.includes('opportunit') || q.includes('missing') || q.includes('gap')) {
    widgets.push({
      type: 'insight-text',
      title: 'Whitespace Opportunities',
      body: '**LinkedIn B2B** — Only ENI is active. Fleet management and corporate card messaging is almost entirely unclaimed.\n\n**Do-stage on Google** — Shell just entered this space. ORLEN\'s bottom-of-funnel Google presence is minimal.\n\n**Care-stage retention** — Only 8% of all competitor ads target existing customers. ORLEN\'s loyalty programme is under-activated.',
    })
  }
  if (widgets.length === 0) {
    widgets.push({ type: 'spend-chart', title: 'Weekly Estimated Spend by Brand' })
    widgets.push({ type: 'pi-ranking', title: 'Performance Index Ranking' })
  }
  return widgets
}

function PLATFORM_COLOR(p: string) {
  return ({ Meta: '#1877F2', Google: '#34A853', LinkedIn: '#0A66C2' } as Record<string, string>)[p] ?? '#888'
}
function PI_COLOR(pi: number) {
  return pi > 70 ? '#16a34a' : pi > 50 ? '#d97706' : '#dc2626'
}

function SmartWidgetCard({ widget, onNavigate }: { widget: SmartWidget; onNavigate: (v: ViewId) => void }) {
  if (widget.type === 'spend-chart') {
    return (
      <div className="bg-white rounded-lg border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{widget.title}</p>
          <button onClick={() => onNavigate('overview')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">Open full view <ArrowRight className="size-3" /></button>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklySpendMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: unknown) => [`€${Number(v).toLocaleString()}`, undefined] as [string, undefined]} />
              {Object.entries(BRAND_COLORS).map(([k, c]) => (
                <Bar key={k} dataKey={k} stackId="a" fill={c} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (widget.type === 'pi-ranking') {
    return (
      <div className="bg-white rounded-lg border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{widget.title}</p>
          <button onClick={() => onNavigate('competitive')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">Open full view <ArrowRight className="size-3" /></button>
        </div>
        <div className="space-y-2">
          {performanceIndexRanking.map((entry, i) => (
            <div key={entry.advertiser} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-3 tabular-nums">{i + 1}</span>
              <span className="text-xs font-medium w-16 truncate">{entry.advertiser}</span>
              <div className="flex-1 bg-zinc-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(entry.score / 80) * 100}%`,
                    backgroundColor: entry.advertiser === 'ORLEN' ? BRAND_COLORS.orlen : '#94A3B8',
                  }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: PI_COLOR(entry.score) }}>{entry.score}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (widget.type === 'creatives') {
    const items = creativeLibrary
      .filter(c => (!widget.brand || c.brand === widget.brand) && (!widget.platform || c.platform === widget.platform))
      .slice(0, 4)
    return (
      <div className="bg-white rounded-lg border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{widget.title}</p>
          <button onClick={() => onNavigate('creative-library')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">Browse all <ArrowRight className="size-3" /></button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {items.map(c => (
            <div key={c.id} className="rounded-md border border-border overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: BRAND_COLORS[c.brand.toLowerCase().replace(' ', '')] ?? '#888' }}>
                  {c.brand.charAt(0)}
                </span>
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: PLATFORM_COLOR(c.platform) }}>{c.platform}</span>
                  <span className="text-xs font-bold" style={{ color: PI_COLOR(c.performanceIndex) }}>{c.performanceIndex}</span>
                </div>
                <p className="text-[10px] font-medium line-clamp-2 mt-0.5 leading-snug">{c.title}</p>
              </div>
            </div>
          ))}
        </div>
        {items.length === 0 && <p className="text-xs text-muted-foreground">No creatives match this filter.</p>}
      </div>
    )
  }

  if (widget.type === 'insight-text') {
    const lines = widget.body.split('\n\n')
    return (
      <div className="bg-white rounded-lg border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{widget.title}</p>
          <button onClick={() => onNavigate('orlen')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">Open full view <ArrowRight className="size-3" /></button>
        </div>
        <div className="space-y-3">
          {lines.map((line, i) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/)
            return (
              <div key={i} className="flex gap-2">
                <div className="size-1.5 rounded-full bg-zinc-800 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {parts.map((p, j) =>
                    p.startsWith('**') && p.endsWith('**')
                      ? <strong key={j} className="text-foreground">{p.slice(2, -2)}</strong>
                      : p
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeView({ workspaceName, onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [widgets, setWidgets] = useState<SmartWidget[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function handleSubmit(q: string) {
    if (!q.trim()) return
    setIsAnalyzing(true)
    setSubmitted(q)
    setTimeout(() => {
      setWidgets(resolveWidgets(q))
      setIsAnalyzing(false)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }, 900)
  }

  function clearFilter() {
    setQuery('')
    setSubmitted('')
    setWidgets([])
  }

  return (
    <div className="space-y-6">

      {/* ── Welcome bar ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {workspaceName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Week of 30 Mar – 05 Apr 2026 · 2 of 4 sources synced</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live data
          </div>
        </div>
      </div>

      {/* ── AI Smart Filter ── */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-zinc-500" />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">AI Smart Filter</span>
        </div>
        <p className="text-white font-semibold text-lg mb-4">What would you like to analyze today?</p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(query)}
              placeholder="e.g. Shell spend on Meta, top creative performance, ORLEN whitespace…"
              className="w-full h-11 pl-10 pr-4 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/15"
            />
          </div>
          <Button
            onClick={() => handleSubmit(query)}
            disabled={!query.trim() || isAnalyzing}
            className="h-11 px-5 bg-zinc-900 hover:bg-zinc-700 text-white border-0 gap-2"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-1.5"><span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing…</span>
            ) : (
              <><Send className="size-3.5" />Analyze</>
            )}
          </Button>
        </div>

        {/* Suggestions */}
        {!submitted && (
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); handleSubmit(s) }}
                className="text-[11px] text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Active filter badge */}
        {submitted && !isAnalyzing && (
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-white/15 text-white border-white/20 gap-1.5 text-xs font-normal">
              <Sparkles className="size-3" />
              "{submitted}"
            </Badge>
            <button onClick={clearFilter} className="text-white/40 hover:text-white/70 transition-colors">
              <X className="size-3.5" />
            </button>
            <button
              onClick={() => onNavigate('ai')}
              className="ml-auto text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors"
            >
              Open in AI Insights <ArrowRight className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Smart Filter Results ── */}
      {widgets.length > 0 && (
        <div ref={resultsRef} className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-zinc-500" />
            <p className="text-sm font-medium">Results for "{submitted}"</p>
            <span className="text-xs text-muted-foreground">— {widgets.length} widget{widgets.length > 1 ? 's' : ''} generated</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {widgets.map((w, i) => (
              <SmartWidgetCard key={i} widget={w} onNavigate={onNavigate} />
            ))}
          </div>
          <div className="h-px bg-border" />
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {executiveMetrics.map(m => (
          <KpiCard key={m.label} label={m.label} value={m.value} delta={m.delta} direction={m.direction} />
        ))}
      </div>

      {/* ── Two-column: insights + AI chat entry ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Auto insights — 2 cols */}
        <div className="xl:col-span-2 space-y-3">
          <p className="text-sm font-semibold">This Week's Highlights</p>
          {AUTO_INSIGHTS.map(insight => {
            const Icon = insight.icon
            return (
              <div
                key={insight.title}
                className={cn(
                  'bg-white rounded-lg border shadow-sm p-4 flex gap-3',
                  insight.type === 'warning' && 'border-amber-200',
                  insight.type === 'success' && 'border-emerald-200',
                  insight.type === 'info'    && 'border-blue-200',
                )}
              >
                <div className={cn(
                  'size-8 rounded-lg flex items-center justify-center shrink-0',
                  insight.type === 'warning' && 'bg-amber-50 text-amber-600',
                  insight.type === 'success' && 'bg-emerald-50 text-emerald-600',
                  insight.type === 'info'    && 'bg-blue-50 text-blue-600',
                )}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.body}</p>
                </div>
                <button
                  onClick={() => onNavigate(insight.view)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 self-center"
                >
                  {insight.action} <ArrowRight className="size-3" />
                </button>
              </div>
            )
          })}
        </div>

        {/* AI chat entry — 1 col */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-lg p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-3.5 text-zinc-500" />
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">AI Insights</span>
          </div>
          <p className="text-white font-semibold mt-1 mb-2">Ask anything about your data</p>
          <p className="text-xs text-white/40 mb-4 leading-relaxed">
            Full context of this week's spend, creatives, platform mix, and performance scores.
          </p>
          <div className="space-y-1.5 mb-4">
            {[
              'Why did ORLEN\'s share drop?',
              'Which competitor is growing fastest?',
              'What\'s the top creative this week?',
            ].map(q => (
              <button
                key={q}
                onClick={() => onNavigate('ai')}
                className="w-full text-left text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-md px-3 py-2 transition-colors flex items-center justify-between group"
              >
                {q}
                <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
          <Button
            onClick={() => onNavigate('ai')}
            className="mt-auto bg-zinc-900 hover:bg-zinc-700 text-white border-0 gap-2 w-full"
            size="sm"
          >
            <Sparkles className="size-3.5" />
            Open AI Insights
          </Button>
        </div>
      </div>

      {/* ── Explore the tool ── */}
      <div>
        <p className="text-sm font-semibold mb-3">Explore the Tool</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {EXPLORE_SHORTCUTS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="bg-white rounded-lg border border-border shadow-sm p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div
                  className="size-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${item.color}15`, border: `1.5px solid ${item.color}30` }}
                >
                  <Icon className="size-5" style={{ color: item.color }} />
                </div>
                <p className="text-sm font-semibold mb-1 group-hover:text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: item.color }}>
                  Explore <ArrowRight className="size-3" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Top creatives strip ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Top Creatives This Week</p>
          <button
            onClick={() => onNavigate('creative-library')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View all <ArrowRight className="size-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {creativeLibrary.slice(0, 5).map(c => {
            const brandColor = (BRAND_COLORS as Record<string, string>)[c.brand.toLowerCase().replace(' ', '')] ?? '#888'
            const platformColor = PLATFORM_COLOR(c.platform)
            const sentimentPct = ((c.sentiment + 1) / 2) * 100
            return (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={() => onNavigate('creative-library')}
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <span className="text-xl font-bold" style={{ color: brandColor }}>{c.brand.charAt(0)}</span>
                </div>
                <div className="p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold" style={{ color: platformColor }}>{c.platform}</span>
                    <span className="text-xs font-bold" style={{ color: PI_COLOR(c.performanceIndex) }}>{c.performanceIndex}</span>
                  </div>
                  <p className="text-[11px] font-medium line-clamp-2 leading-snug">{c.title}</p>
                  <div className="mt-2">
                    <Progress value={sentimentPct} className="h-1 mt-0.5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
