'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  ArrowRight,
  Sparkles,
  ImageIcon,
  Users,
  LayoutDashboard,
  TrendingUp,
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
import { getBrandColor, BRAND_COLORS_EVENT } from '@/lib/brand-colors'
import { cn } from '@/lib/utils'

type ViewId =
  | 'overview' | 'competitive' | 'performance' | 'orlen'
  | 'ai' | 'creative-library' | 'alerts' | 'connections' | 'setup'

interface Props {
  workspaceName: string
  workspaceId?: string
  ownBrand?: string
  onNavigate: (view: ViewId) => void
  connectionId?: string
  dateFrom?: string
  dateTo?: string
  datePeriod?: string
}

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
    label: 'Brand Deep Dive',
    description: 'Brand scorecard vs market opportunities',
    color: '#18181b',
  },
]

// ─── AI Smart Filter ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Which brand is spending the most this week?',
  'Whitespace opportunities I should act on',
  'How is my brand performing vs competitors?',
  'Which competitor should I watch most closely?',
  'What funnel stages are competitors focusing on?',
]

function PI_COLOR(pi: number) {
  return pi > 70 ? '#16a34a' : pi > 50 ? '#d97706' : '#dc2626'
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    return (
      <span key={i}>
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
        {i < arr.length - 1 && <br />}
      </span>
    )
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeView({ workspaceName, workspaceId, ownBrand = '', onNavigate, connectionId, dateFrom, dateTo, datePeriod }: Props) {
  // Re-render when brand colors change in Setup
  const [, setColorTick] = useState(0)
  useEffect(() => {
    const h = () => setColorTick(t => t + 1)
    window.addEventListener(BRAND_COLORS_EVENT, h)
    return () => window.removeEventListener(BRAND_COLORS_EVENT, h)
  }, [])

  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Real data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveData, setLiveData] = useState<Record<string, any> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveCreatives, setLiveCreatives] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(!!workspaceId)

  useEffect(() => {
    if (!workspaceId) return
    const brand = ownBrand ? `&brand=${encodeURIComponent(ownBrand)}` : ''
    const src = connectionId ? `&connectionId=${connectionId}` : ''
    const df = dateFrom ? `&from=${dateFrom}` : ''
    const dt = dateTo ? `&to=${dateTo}` : ''
    const dp = datePeriod ? `&period=${datePeriod}` : ''
    let overviewDone = false
    let performanceDone = false
    function checkDone() {
      if (overviewDone && performanceDone) setLoading(false)
    }
    fetch(`/api/data/overview?workspaceId=${workspaceId}${brand}${src}${df}${dt}${dp}`)
      .then(r => r.json())
      .then(d => { if (d.hasData) setLiveData(d) })
      .catch(() => {})
      .finally(() => { overviewDone = true; checkDone() })
    fetch(`/api/data/performance?workspaceId=${workspaceId}${src}${df}${dt}${dp}`)
      .then(r => r.json())
      .then(d => { if (d.hasData && d.topCreatives?.length) setLiveCreatives(d.topCreatives) })
      .catch(() => {})
      .finally(() => { performanceDone = true; checkDone() })
  }, [workspaceId, ownBrand, connectionId, dateFrom, dateTo, datePeriod])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-zinc-100 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-zinc-100 rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="h-48 bg-zinc-100 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-zinc-100 rounded-lg animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-lg animate-pulse" />)}
        </div>
        <div className="h-64 bg-zinc-100 rounded-lg animate-pulse" />
      </div>
    </div>
  )

  const kpiMetrics = liveData?.executiveMetrics ?? []
  const spendChartData = liveData?.weeklySpendMovement ?? []
  const brandLabel = ownBrand || 'Your Brand'

  function handleSubmit(q: string) {
    if (!q.trim()) return
    setIsAnalyzing(true)
    setSubmitted(q)
    setAiAnswer('')

    if (!workspaceId) {
      setIsAnalyzing(false)
      return
    }

    const abort = new AbortController()
    abortRef.current = abort

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abort.signal,
      body: JSON.stringify({
        workspaceId,
        ownBrand,
        connectionId,
        messages: [{ role: 'user', content: q }],
      }),
    })
      .then(async res => {
        if (!res.ok) { setAiAnswer('Could not get a response right now.'); return }
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setAiAnswer(accumulated)
        }
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      })
      .catch(() => {})
      .finally(() => { setIsAnalyzing(false); abortRef.current = null })
  }

  function clearFilter() {
    abortRef.current?.abort()
    setQuery('')
    setSubmitted('')
    setAiAnswer('')
    setIsAnalyzing(false)
  }

  return (
    <div className="space-y-6">

      {/* ── Welcome bar ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {workspaceName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{(() => {
            const now = new Date()
            const day = now.getUTCDay()
            const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
            const mon = new Date(now); mon.setUTCDate(diff)
            const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
            const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            return `Week of ${fmt(mon)} – ${fmt(sun)}`
          })()}</p>
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
              placeholder="e.g. Who is spending the most? Top creative performance, whitespace opportunities…"
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
      {(submitted && (aiAnswer || isAnalyzing)) && (
        <div ref={resultsRef} className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-zinc-500" />
            <p className="text-sm font-medium text-muted-foreground">"{submitted}"</p>
          </div>
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">
            <div className="text-sm leading-relaxed text-foreground min-h-[2rem]">
              {aiAnswer
                ? renderMarkdown(aiAnswer)
                : (
                  <span className="flex gap-1 items-center h-5">
                    <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                    <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                    <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                )
              }
            </div>
            {aiAnswer && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Sparkles className="size-3" /> Powered by Claude</span>
                <button
                  onClick={() => onNavigate('ai')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Continue in AI Insights <ArrowRight className="size-3" />
                </button>
              </div>
            )}
          </div>
          <div className="h-px bg-border" />
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiMetrics.map((m: { label: string; value: string; delta: string; direction: 'up' | 'down' }) => (
          <KpiCard key={m.label} label={m.label} value={m.value} delta={m.delta} direction={m.direction} />
        ))}
      </div>

      {/* ── Two-column: insights + AI chat entry ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Highlights — derived from live data — 2 cols */}
        <div className="xl:col-span-2 space-y-3">
          <p className="text-sm font-semibold">This Week's Highlights</p>
          {liveData ? (
            (() => {
              const table: { advertiser: string; totalAds: number; newAds: number; weeklySpend: number; avgPi: number | null }[] =
                liveData.table ?? []
              const sorted = [...table].sort((a, b) => b.weeklySpend - a.weeklySpend)
              const topSpender = sorted[0]
              const topPi = [...table].sort((a, b) => (b.avgPi ?? 0) - (a.avgPi ?? 0))[0]
              const mostNewAds = [...table].sort((a, b) => b.newAds - a.newAds)[0]
              const highlights = [
                topSpender && {
                  type: 'warning' as const, icon: TrendingUp,
                  title: `${topSpender.advertiser} leads spend this week`,
                  body: `Estimated weekly spend €${topSpender.weeklySpend.toLocaleString()} with ${topSpender.totalAds} active ads.`,
                  action: 'View Market Overview', view: 'overview' as ViewId,
                },
                topPi && topPi.avgPi != null && {
                  type: 'success' as const, icon: CheckCircle2,
                  title: `${topPi.advertiser} has highest avg. PI`,
                  body: `Average performance index of ${topPi.avgPi} across ${topPi.totalAds} ads this week.`,
                  action: 'View Performance', view: 'performance' as ViewId,
                },
                mostNewAds && mostNewAds.newAds > 0 && {
                  type: 'info' as const, icon: TrendingUp,
                  title: `${mostNewAds.advertiser} most active with new ads`,
                  body: `${mostNewAds.newAds} new ads launched this week out of ${mostNewAds.totalAds} total active.`,
                  action: 'View Competitive Intel', view: 'competitive' as ViewId,
                },
              ].filter(Boolean) as { type: 'warning'|'success'|'info'; icon: React.ElementType; title: string; body: string; action: string; view: ViewId }[]
              if (highlights.length === 0) return (
                <div className="bg-zinc-50 rounded-lg border border-border p-5 text-center text-xs text-muted-foreground">
                  No highlights available yet — sync your data to see insights.
                </div>
              )
              return highlights.map(insight => {
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
              })
            })()
          ) : (
            <div className="bg-zinc-50 rounded-lg border border-border p-5 text-center text-xs text-muted-foreground">
              Connect and sync your Snowflake data to see live highlights here.
            </div>
          )}
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
              `Why did ${brandLabel}'s share drop?`,
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
                <p className="text-sm font-semibold mb-1 group-hover:text-foreground">
                  {item.id === 'orlen' && ownBrand ? `${ownBrand} Deep Dive` : item.label}
                </p>
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
          {liveCreatives
            ? liveCreatives.slice(0, 5).map((c: { id: string; brand: string; title: string; performanceIndex: number; funnelStage: string }) => {
                const brandColor = getBrandColor(c.brand, 0)
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
                        <span className="text-[10px] font-semibold text-muted-foreground">{c.funnelStage}</span>
                        <span className="text-xs font-bold" style={{ color: PI_COLOR(c.performanceIndex) }}>{c.performanceIndex}</span>
                      </div>
                      <p className="text-[11px] font-medium line-clamp-2 leading-snug">{c.title}</p>
                      <div className="mt-2">
                        <Progress value={(c.performanceIndex / 100) * 100} className="h-1 mt-0.5" />
                      </div>
                    </div>
                  </div>
                )
              })
            : (
              <div className="col-span-5 flex flex-col items-center justify-center gap-2 py-8 bg-white rounded-lg border border-border">
                <ImageIcon className="size-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No creatives yet — sync your Snowflake data first.</p>
                <button onClick={() => onNavigate('connections')} className="text-xs text-indigo-600 hover:underline">Go to Connections</button>
              </div>
            )
          }
        </div>
      </div>

    </div>
  )
}
