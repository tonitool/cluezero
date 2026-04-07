'use client'

import { useState, useEffect } from 'react'
import {
  Brain,
  Zap,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  RefreshCcw,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Sparkles,
  Loader2,
  XCircle,
} from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low'
type Trend    = 'up' | 'down' | 'flat'

interface BriefStat {
  label: string
  value: string
  delta: string
  up:    boolean
}

interface Threat {
  brand:    string
  severity: 'high' | 'medium' | 'low'
  title:    string
  detail:   string
}

interface Opportunity {
  title:     string
  detail:    string
  potential: 'high' | 'medium' | 'low'
  channel:   string
}

interface Recommendation {
  priority:   Priority
  title:      string
  reasoning:  string
  action:     string
  confidence: number
  timeframe:  string
  effort:     'low' | 'medium' | 'high'
}

interface WatchItem {
  brand:  string
  signal: string
  trend:  Trend
}

interface StrategyBrief {
  summary:         string
  stats:           BriefStat[]
  threats:         Threat[]
  opportunities:   Opportunity[]
  recommendations: Recommendation[]
  watchList:       WatchItem[]
}

interface BriefHistoryItem {
  id:           string
  generated_at: string
  week_label:   string
  rec_count:    number
}

interface StrategyContext {
  positioning:       string
  goal:              string
  primaryCompetitor: string
  budgetContext:     string
  focusAreas:        string
  notes:             string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', className: 'bg-rose-50 text-rose-700 border-rose-200',   bar: 'bg-rose-500' },
  high:     { label: 'High',     className: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' },
  medium:   { label: 'Medium',   className: 'bg-blue-50 text-blue-700 border-blue-200',    bar: 'bg-blue-500' },
  low:      { label: 'Low',      className: 'bg-zinc-50 text-zinc-500 border-zinc-200',    bar: 'bg-zinc-300' },
}

const EFFORT_CONFIG = {
  low:    { label: 'Low effort',    className: 'text-emerald-600' },
  medium: { label: 'Medium effort', className: 'text-amber-600' },
  high:   { label: 'High effort',   className: 'text-rose-600' },
}

const SEVERITY_CONFIG = {
  high:   { label: 'High',   className: 'bg-rose-50 text-rose-700 border-rose-200' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { label: 'Low',    className: 'bg-zinc-50 text-zinc-500 border-zinc-200' },
}

const POTENTIAL_CONFIG = {
  high:   { label: 'High potential',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium potential', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  low:    { label: 'Low potential',    className: 'bg-zinc-50 text-zinc-500 border-zinc-200' },
}

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus }

const AGENT_STEPS = [
  'Reading this week\'s competitive data…',
  'Analysing spend movements across all brands…',
  'Cross-referencing with your brand context…',
  'Identifying threats and opportunities…',
  'Generating prioritised recommendations…',
  'Brief ready ✓',
]

function competitorColor(name: string): string {
  const map: Record<string, string> = {
    Shell: '#B8860B', Aral: '#0066B2', 'Circle K': '#EC6B1E', ENI: '#5C5C5C', Esso: '#003087',
  }
  if (map[name]) return map[name]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  const palette = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
  return palette[hash % palette.length]
}

function makeEmptyContext(): StrategyContext {
  return { positioning: '', goal: '', primaryCompetitor: '', budgetContext: '', focusAreas: '', notes: '' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.medium
  const eff = EFFORT_CONFIG[rec.effort] ?? EFFORT_CONFIG.medium

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full shrink-0', cfg.bar)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-[10px] font-semibold', cfg.className)}>{cfg.label}</Badge>
              <span className={cn('text-[10px] font-medium', eff.className)}>{eff.label}</span>
              <span className="text-[10px] text-muted-foreground">· {rec.timeframe}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-muted-foreground">Confidence</span>
              <span className="text-xs font-bold tabular-nums" style={{
                color: rec.confidence >= 80 ? '#16a34a' : rec.confidence >= 65 ? '#d97706' : '#dc2626'
              }}>
                {rec.confidence}%
              </span>
            </div>
          </div>
          <p className="text-sm font-semibold leading-snug mb-1">{rec.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rec.reasoning}</p>
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Recommended action</p>
              <p className="text-xs text-foreground leading-relaxed">{rec.action}</p>
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Spawn overlay ────────────────────────────────────────────────────────────

function AgentSpawnOverlay({ step, error }: { step: number; error?: string }) {
  const progress = Math.round((step / AGENT_STEPS.length) * 100)

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className={cn('size-10 rounded-full bg-zinc-900 flex items-center justify-center', !error && 'animate-pulse')}>
            {error
              ? <XCircle className="size-5 text-rose-400" />
              : <Brain className="size-5 text-white" />}
          </div>
          <div>
            <p className="font-semibold">{error ? 'Agent failed' : 'Strategy Agent Running'}</p>
            <p className="text-xs text-muted-foreground">{error ? error : 'Analysing competitive landscape…'}</p>
          </div>
        </div>

        {!error && (
          <>
            <div className="h-1.5 bg-zinc-100 rounded-full mb-6 overflow-hidden">
              <div className="h-full bg-zinc-900 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-2.5">
              {AGENT_STEPS.map((s, i) => (
                <div key={i} className={cn('flex items-center gap-2.5 transition-all', i < step ? 'opacity-100' : 'opacity-20')}>
                  {i < step - 1
                    ? <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    : i === step - 1
                      ? <div className="size-3.5 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin shrink-0" />
                      : <div className="size-3.5 rounded-full border border-zinc-200 shrink-0" />}
                  <span className={cn('text-xs', i === step - 1 ? 'text-foreground font-medium' : i < step ? 'text-muted-foreground' : 'text-zinc-300')}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StrategyProps {
  workspaceId?: string
  ownBrand?:    string
  connectionId?: string
  onNavigate?:  (view: string) => void
}

export function StrategyView({ workspaceId, ownBrand, connectionId, onNavigate }: StrategyProps) {
  const brandLabel = ownBrand || 'Your Brand'

  // Context state
  const [context,      setContext]     = useState<StrategyContext>(makeEmptyContext)
  const [draftCtx,     setDraftCtx]    = useState<StrategyContext>(makeEmptyContext)
  const [editingCtx,   setEditingCtx]  = useState(false)
  const [savingCtx,    setSavingCtx]   = useState(false)

  // Brief state
  const [brief,        setBrief]       = useState<StrategyBrief | null>(null)
  const [weekLabel,    setWeekLabel]   = useState<string>('')
  const [generatedAt,  setGeneratedAt] = useState<string>('')
  const [history,      setHistory]     = useState<BriefHistoryItem[]>([])

  // Spawn state
  const [spawning,     setSpawning]    = useState(false)
  const [spawnStep,    setSpawnStep]   = useState(0)
  const [spawnError,   setSpawnError]  = useState<string | undefined>()

  // UI state
  const [expandedSection, setExpanded] = useState<string | null>('recommendations')

  const briefReady = brief !== null

  // Load agent context + brief history on mount
  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/workspace/profile?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (d.strategyContext) {
          const sc: StrategyContext = {
            positioning:       d.strategyContext.positioning       ?? '',
            goal:              d.strategyContext.goal              ?? '',
            primaryCompetitor: d.strategyContext.primaryCompetitor ?? '',
            budgetContext:     d.strategyContext.budgetContext      ?? '',
            focusAreas:        d.strategyContext.focusAreas        ?? '',
            notes:             d.strategyContext.notes             ?? '',
          }
          setContext(sc)
          setDraftCtx(sc)
        }
      })
      .catch(() => {})

    fetch(`/api/strategy/briefs?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.briefs)) setHistory(d.briefs) })
      .catch(() => {})
  }, [workspaceId])

  async function saveContext() {
    if (!workspaceId) return
    setSavingCtx(true)
    try {
      const ws = await fetch(`/api/workspace/profile?workspaceId=${workspaceId}`)
        .then(r => r.json())
      await fetch('/api/workspace/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name:            ws.name    ?? '',
          slug:            ws.slug    ?? '',
          strategyContext: draftCtx,
        }),
      })
      setContext(draftCtx)
      setEditingCtx(false)
    } catch {
      // silently keep editing
    } finally {
      setSavingCtx(false)
    }
  }

  async function spawnAgent() {
    if (!workspaceId || spawning) return
    setBrief(null)
    setSpawnError(undefined)
    setSpawning(true)
    setSpawnStep(0)

    // Animate steps
    const timers: ReturnType<typeof setTimeout>[] = []
    AGENT_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setSpawnStep(i + 1), i * 900 + 400))
    })

    try {
      const res = await fetch('/api/strategy/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ workspaceId, connectionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        timers.forEach(clearTimeout)
        setSpawnError(data.error ?? 'Something went wrong')
        setTimeout(() => { setSpawning(false); setSpawnError(undefined) }, 3000)
        return
      }

      // Wait for the last animation step to finish before revealing
      const remaining = AGENT_STEPS.length * 900 + 400 - (AGENT_STEPS.length - 1) * 900
      await new Promise(r => setTimeout(r, Math.max(remaining, 600)))

      setBrief(data.brief as StrategyBrief)
      setWeekLabel(data.weekLabel ?? '')
      setGeneratedAt(data.generatedAt ?? new Date().toISOString())
      setExpanded('recommendations')

      // Refresh history
      fetch(`/api/strategy/briefs?workspaceId=${workspaceId}`)
        .then(r => r.json())
        .then(d => { if (Array.isArray(d.briefs)) setHistory(d.briefs) })
        .catch(() => {})
    } catch {
      timers.forEach(clearTimeout)
      setSpawnError('Network error — please try again')
      setTimeout(() => { setSpawning(false); setSpawnError(undefined) }, 3000)
      return
    }

    setSpawning(false)
  }

  function toggleSection(s: string) {
    setExpanded(v => v === s ? null : s)
  }

  // ── Empty state for unconnected workspaces ──────────────────────────────────
  if (!workspaceId) return (
    <div>
      <SectionHeader title="Strategy Intelligence" description="AI Agent that reads your competitive data and generates strategic recommendations" />
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="size-16 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg">
          <Brain className="size-8 text-white" />
        </div>
        <div>
          <p className="text-base font-semibold">Strategy Agent not yet configured</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
            Connect your Snowflake data source and complete your Brand &amp; AI Profile to unlock Strategy Intelligence.
          </p>
        </div>
        {onNavigate && (
          <div className="flex gap-3">
            <button onClick={() => onNavigate('connections')} className="text-xs bg-zinc-900 text-white rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors">
              Connect Data Source
            </button>
            <button onClick={() => onNavigate('setup')} className="text-xs border border-border rounded-lg px-4 py-2 hover:bg-zinc-50 transition-colors">
              Complete Brand Profile
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {spawning && <AgentSpawnOverlay step={spawnStep} error={spawnError} />}

      <SectionHeader
        title="Strategy Intelligence"
        description="AI Agent that reads your competitive data and generates strategic briefs"
      >
        <Button size="sm" className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-700 text-white" onClick={spawnAgent} disabled={spawning}>
          {spawning ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
          {spawning ? 'Running…' : 'Spawn Agent'}
        </Button>
      </SectionHeader>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-4 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <div className={cn('size-2 rounded-full', briefReady ? 'bg-emerald-500' : 'bg-zinc-300')} />
          <span className="text-sm font-medium">{briefReady ? 'Brief ready' : 'No brief yet'}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        {briefReady ? (
          <>
            {generatedAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                Generated {new Date(generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {weekLabel && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Week of {weekLabel}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="size-2.5" />
                {brief?.recommendations?.length ?? 0} recommendations
              </Badge>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={spawnAgent} disabled={spawning}>
                <RefreshCcw className="size-3" />
                Re-run
              </Button>
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Configure your Agent Context on the right, then click <strong>Spawn Agent</strong> to generate your first brief.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left: brief content ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* First-run empty state */}
          {!briefReady && (
            <div className="flex flex-col items-center justify-center py-20 gap-5 text-center bg-white rounded-xl border border-border shadow-sm">
              <div className="size-14 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg">
                <Sparkles className="size-7 text-white" />
              </div>
              <div>
                <p className="text-base font-semibold">No strategy brief yet</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                  Fill in your Agent Context on the right, then click <strong>Spawn Agent</strong> to generate your first competitive brief — threats, opportunities, and prioritised actions tailored to {brandLabel}.
                </p>
              </div>
              <Button size="sm" className="h-9 gap-2 text-xs bg-zinc-900 hover:bg-zinc-700 text-white px-5" onClick={spawnAgent} disabled={spawning}>
                <Zap className="size-3.5" />
                Spawn Agent now
              </Button>
            </div>
          )}

          {briefReady && <>

            {/* Summary card */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="size-4 text-zinc-500" />
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                  Strategic Brief{weekLabel ? ` · w/e ${weekLabel}` : ''}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/90">{brief?.summary}</p>
              {brief?.stats && brief.stats.length > 0 && (
                <div className="flex gap-3 mt-4">
                  {brief.stats.map(m => (
                    <div key={m.label} className="bg-white/10 rounded-lg px-3 py-2 flex-1">
                      <p className="text-[10px] text-white/40 uppercase tracking-wide">{m.label}</p>
                      <p className="text-lg font-bold text-white">{m.value}</p>
                      <p className={cn('text-[10px]', m.up ? 'text-emerald-400' : 'text-rose-400')}>{m.delta}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Threats */}
            {brief?.threats && brief.threats.length > 0 && (
              <div>
                <button className="flex items-center justify-between w-full mb-3" onClick={() => toggleSection('threats')}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-rose-500" />
                    <p className="text-sm font-semibold">Top Threats</p>
                    <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">{brief.threats.length}</Badge>
                  </div>
                  {expandedSection === 'threats' ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
                {expandedSection === 'threats' && (
                  <div className="space-y-3">
                    {brief.threats.map((t, i) => {
                      const sev = SEVERITY_CONFIG[t.severity] ?? SEVERITY_CONFIG.medium
                      return (
                        <div key={i} className="bg-white rounded-lg border border-border shadow-sm p-4 flex gap-3">
                          <div className="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: competitorColor(t.brand) }}>
                            {t.brand.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">{t.brand}</span>
                              <Badge variant="outline" className={cn('text-[10px]', sev.className)}>{sev.label} severity</Badge>
                            </div>
                            <p className="text-xs font-medium mb-0.5">{t.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t.detail}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Opportunities */}
            {brief?.opportunities && brief.opportunities.length > 0 && (
              <div>
                <button className="flex items-center justify-between w-full mb-3" onClick={() => toggleSection('opportunities')}>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="size-4 text-emerald-500" />
                    <p className="text-sm font-semibold">Opportunities</p>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">{brief.opportunities.length}</Badge>
                  </div>
                  {expandedSection === 'opportunities' ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
                {expandedSection === 'opportunities' && (
                  <div className="space-y-3">
                    {brief.opportunities.map((o, i) => {
                      const pot = POTENTIAL_CONFIG[o.potential] ?? POTENTIAL_CONFIG.medium
                      return (
                        <div key={i} className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className={cn('text-[10px]', pot.className)}>{pot.label}</Badge>
                            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">{o.channel}</Badge>
                          </div>
                          <p className="text-xs font-semibold mb-0.5">{o.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{o.detail}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {brief?.recommendations && brief.recommendations.length > 0 && (
              <div>
                <button className="flex items-center justify-between w-full mb-3" onClick={() => toggleSection('recommendations')}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-zinc-500" />
                    <p className="text-sm font-semibold">Recommended Actions</p>
                    <Badge variant="outline" className="text-[10px] bg-zinc-50 text-zinc-500 border-zinc-200">{brief.recommendations.length}</Badge>
                  </div>
                  {expandedSection === 'recommendations' ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
                {expandedSection === 'recommendations' && (
                  <div className="space-y-3">
                    {brief.recommendations.map((r, i) => <RecommendationCard key={i} rec={r} />)}
                  </div>
                )}
              </div>
            )}

            {/* Watch list */}
            {brief?.watchList && brief.watchList.length > 0 && (
              <div className="bg-white rounded-lg border border-border shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="size-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Watch List — Next Week</p>
                </div>
                <div className="space-y-2.5">
                  {brief.watchList.map((w, i) => {
                    const TrendIcon = TREND_ICONS[w.trend] ?? Minus
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="size-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: competitorColor(w.brand) }}>
                          {w.brand.charAt(0)}
                        </div>
                        <span className="text-xs font-medium w-16 shrink-0">{w.brand}</span>
                        <span className="text-xs text-muted-foreground flex-1">{w.signal}</span>
                        <TrendIcon className={cn('size-3.5 shrink-0',
                          w.trend === 'up' ? 'text-amber-500' : w.trend === 'down' ? 'text-blue-500' : 'text-zinc-400'
                        )} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>}
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-4">

          {/* Agent Context */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-zinc-500" />
                <p className="text-sm font-semibold">Agent Context</p>
              </div>
              {!editingCtx ? (
                <button onClick={() => { setDraftCtx(context); setEditingCtx(true) }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Edit3 className="size-3" /> Edit
                </button>
              ) : (
                <button onClick={saveContext} disabled={savingCtx}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium disabled:opacity-50">
                  {savingCtx ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Save
                </button>
              )}
            </div>

            <div className="space-y-3">
              {([
                { key: 'positioning',       label: 'Brand positioning',    ph: `How ${brandLabel} competes — differentiators, tone, strengths` },
                { key: 'goal',              label: 'Strategic goal',        ph: `e.g. Grow ${brandLabel}'s spend share from 15% to 20% this quarter` },
                { key: 'primaryCompetitor', label: 'Primary competitor',    ph: 'e.g. Aral, Shell, Coca-Cola…' },
                { key: 'budgetContext',      label: 'Budget context',        ph: 'e.g. Mid-tier, efficiency focus, Meta primary channel' },
                { key: 'focusAreas',        label: 'Focus areas',           ph: 'e.g. Do-stage conversion on Google, Care-stage retention on Meta' },
                { key: 'notes',             label: 'Agent notes',           ph: 'Upcoming campaigns, launches, or seasonal moments to factor in' },
              ] as { key: keyof StrategyContext; label: string; ph: string }[]).map(({ key, label, ph }) => (
                <div key={key}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                  {editingCtx ? (
                    <textarea
                      value={draftCtx[key]}
                      onChange={e => setDraftCtx(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={ph}
                      className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed placeholder:text-zinc-400"
                      rows={key === 'positioning' || key === 'goal' || key === 'notes' ? 3 : 2}
                    />
                  ) : context[key] ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{context[key]}</p>
                  ) : (
                    <p className="text-xs text-zinc-300 italic">{ph}{' '}
                      <button onClick={() => { setDraftCtx(context); setEditingCtx(true) }}
                        className="not-italic text-indigo-400 hover:text-indigo-600 underline">Add</button>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {editingCtx && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button size="sm" className="w-full h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-700 text-white" onClick={saveContext} disabled={savingCtx}>
                  {savingCtx ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {savingCtx ? 'Saving…' : 'Save & Retrain Agent'}
                </Button>
              </div>
            )}
          </div>

          {/* Brief History */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Brief History</p>
            </div>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                <History className="size-6 text-zinc-300" />
                <p className="text-xs font-medium text-muted-foreground">No history yet</p>
                <p className="text-[11px] text-zinc-400 leading-snug max-w-[160px]">
                  Previous briefs will appear here after each agent run.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={h.id} className="pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">
                        {new Date(h.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{h.rec_count} recs</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">Week of {h.week_label}</p>
                    {i === 0 && <span className="text-[10px] text-emerald-600 font-medium">Current</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
