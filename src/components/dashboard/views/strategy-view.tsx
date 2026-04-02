'use client'

import { useState } from 'react'
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
  Calendar,
  History,
  Sparkles,
} from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low'
type Trend    = 'up' | 'down' | 'flat'

interface Recommendation {
  id: string
  priority: Priority
  title: string
  reasoning: string
  action: string
  confidence: number
  timeframe: string
  effort: 'low' | 'medium' | 'high'
}

interface Threat {
  id: string
  brand: string
  title: string
  detail: string
  severity: 'high' | 'medium' | 'low'
}

interface Opportunity {
  id: string
  title: string
  detail: string
  potential: 'high' | 'medium' | 'low'
  channel: string
}

interface WatchItem {
  id: string
  brand: string
  signal: string
  trend: Trend
}

interface BriefHistoryItem {
  id: string
  date: string
  summary: string
  recCount: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_CONTEXT = {
  positioning: 'ORLEN is a premium fuel brand competing on loyalty, convenience, and sustainability in the DACH market. Key differentiators: loyalty programme (VITAY), EV charging network, and premium fuel quality.',
  goal: 'Grow ORLEN\'s share of estimated weekly ad spend from 13.7% to 18% over Q2 2026 while maintaining Performance Index above 65.',
  primaryCompetitor: 'Aral',
  budgetContext: 'Mid-tier budget with efficiency focus. Prioritise Meta and Google over LinkedIn due to cost-per-engagement benchmarks.',
  focusAreas: 'Do-stage conversion on Google, Care-stage loyalty retention on Meta, B2B fleet acquisition on LinkedIn.',
  notes: 'ORLEN VITAY loyalty relaunch planned for May 2026. New EV charging station rollout ongoing in Bavaria.',
}

const THREATS: Threat[] = [
  {
    id: 't1',
    brand: 'Shell',
    severity: 'high',
    title: 'Shell surged +28% spend into Do-stage on Google',
    detail: 'Shell launched 8 new Google ads targeting bottom-of-funnel terms this week. Average PI of 71 suggests strong creative quality. If this sustains 2+ weeks it will compress ORLEN\'s conversion-stage share.',
  },
  {
    id: 't2',
    brand: 'Aral',
    severity: 'medium',
    title: 'Aral consistently outperforms on Meta lifestyle creative',
    detail: 'Aral\'s emotional/lifestyle ad approach on Meta averages PI 74 vs ORLEN\'s transactional approach at PI 61. The creative gap is widening — Aral\'s share of See-stage impressions rose +4 pts this week.',
  },
  {
    id: 't3',
    brand: 'Circle K',
    severity: 'low',
    title: 'Circle K testing Reels format aggressively',
    detail: '3 new Reels-format ads launched this week by Circle K. Early engagement signals are strong. If Reels CPM drops further, Circle K could scale this format quickly on a lower budget.',
  },
]

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'o1',
    title: 'LinkedIn B2B fleet — near-zero competition',
    detail: 'Only ENI has minimal LinkedIn activity targeting fleet decision-makers. ORLEN\'s fleet card product could own this channel. Estimated 180K+ business decision-makers reachable.',
    potential: 'high',
    channel: 'LinkedIn',
  },
  {
    id: 'o2',
    title: 'Google Do-stage before Shell scales',
    detail: 'Shell just entered Do-stage Google ads this week. ORLEN has a 1–2 week window to establish presence and bid competitively before Shell stabilises its campaign. Station-locator and fuel-comparison keywords are underpriced.',
    potential: 'high',
    channel: 'Google',
  },
  {
    id: 'o3',
    title: 'Care-stage loyalty activation is unclaimed',
    detail: 'Only 8% of all competitor ads target existing customers. ORLEN\'s VITAY loyalty programme is a strong differentiator — a Care-stage Meta campaign ahead of the May relaunch would face minimal competition.',
    potential: 'medium',
    channel: 'Meta',
  },
]

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'r1',
    priority: 'critical',
    title: 'Launch Google Do-stage campaign within 7 days',
    reasoning: 'Shell\'s Do-stage Google push is new this week (PI 71). You have a narrow window before they optimise and raise floor CPCs. Entering now while bids are still low will be significantly cheaper than waiting.',
    action: 'Brief a set of 3–5 Do-stage Google ads focused on station-locator intent, fuel price comparison, and VITAY sign-up. Target 15km radius around top 50 ORLEN stations.',
    confidence: 91,
    timeframe: 'This week',
    effort: 'medium',
  },
  {
    id: 'r2',
    priority: 'high',
    title: 'Shift 10% of Meta budget from transactional to lifestyle creative',
    reasoning: 'Aral\'s lifestyle creative on Meta outperforms ORLEN\'s transactional approach by 13 PI points. The format difference is significant — emotional storytelling outperforms offer-led messaging in See/Think stages on Meta.',
    action: 'Test 2–3 Meta ads using emotional narrative (journey, family, sustainability angle). Run A/B against current transactional creative for 2 weeks. If PI delta confirms, scale the winner.',
    confidence: 84,
    timeframe: 'Next 2 weeks',
    effort: 'medium',
  },
  {
    id: 'r3',
    priority: 'high',
    title: 'Activate LinkedIn fleet campaign before VITAY relaunch',
    reasoning: 'May VITAY relaunch is a natural hook for B2B fleet messaging. LinkedIn has near-zero competition in this space now. Establishing presence 4–6 weeks before the relaunch will build awareness at lower CPMs.',
    action: 'Create LinkedIn Sponsored Content targeting "Fleet Manager", "Procurement Manager" and "CFO" at companies with 50+ employees in DACH. Lead with fleet card efficiency angle (cost-per-km savings).',
    confidence: 78,
    timeframe: 'Within 3 weeks',
    effort: 'medium',
  },
  {
    id: 'r4',
    priority: 'medium',
    title: 'Test Meta Reels format before Circle K scales it',
    reasoning: 'Circle K\'s Reels tests are showing early positive signals. Reels CPM is currently 20–35% lower than standard Feed placements. ORLEN has not tested this format. First-mover advantage is typically 2–4 weeks.',
    action: 'Repurpose one existing video creative into a 15-second Reels format. Launch with small budget (€500) as a test. Measure PI and CPM vs Feed equivalent.',
    confidence: 67,
    timeframe: 'Next 3 weeks',
    effort: 'low',
  },
  {
    id: 'r5',
    priority: 'medium',
    title: 'Build Care-stage Meta campaign for VITAY ahead of May relaunch',
    reasoning: 'Only 8% of all competitor ads target existing customers. ORLEN\'s VITAY loyalty programme is a genuine differentiator with low competitive pressure in the Care stage.',
    action: 'Develop a Care-stage Meta campaign targeting existing VITAY members (Custom Audience). Tease the May relaunch benefits. Goal: retention and upsell activation before competitors notice.',
    confidence: 72,
    timeframe: 'Next 4 weeks',
    effort: 'medium',
  },
]

const WATCH_LIST: WatchItem[] = [
  { id: 'w1', brand: 'Shell',    signal: 'Google Do-stage spend — watch if it sustains week 2',  trend: 'up' },
  { id: 'w2', brand: 'Aral',     signal: 'Meta lifestyle creative PI — trending above market avg', trend: 'up' },
  { id: 'w3', brand: 'Circle K', signal: 'Reels format test — 3 ads live, monitor engagement',   trend: 'flat' },
  { id: 'w4', brand: 'ENI',      signal: 'LinkedIn activity dropped — potential budget pause',    trend: 'down' },
]

const BRIEF_HISTORY: BriefHistoryItem[] = [
  { id: 'h1', date: '01 Apr 2026', summary: 'Shell surge detected. 5 recommendations generated.', recCount: 5 },
  { id: 'h2', date: '25 Mar 2026', summary: 'Aral creative gap widening. LinkedIn opportunity identified.', recCount: 4 },
  { id: 'h3', date: '18 Mar 2026', summary: 'ORLEN share dipped to 12.6%. Spend reallocation suggested.', recCount: 6 },
  { id: 'h4', date: '11 Mar 2026', summary: 'Stable week. Esso showed unusual Google activity.', recCount: 3 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', className: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' },
  high:     { label: 'High',     className: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' },
  medium:   { label: 'Medium',   className: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-500' },
  low:      { label: 'Low',      className: 'bg-zinc-50 text-zinc-500 border-zinc-200', bar: 'bg-zinc-300' },
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

const TREND_ICONS = {
  up:   TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

const BRAND_COLORS: Record<string, string> = {
  Shell: '#B8860B', Aral: '#0066B2', 'Circle K': '#EC6B1E', ENI: '#5C5C5C',
  Esso: '#003087', ORLEN: '#E4002B',
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = PRIORITY_CONFIG[rec.priority]
  const eff = EFFORT_CONFIG[rec.effort]

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        {/* Priority bar */}
        <div className={cn('w-1 self-stretch rounded-full shrink-0', cfg.bar)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-[10px] font-semibold', cfg.className)}>
                {cfg.label}
              </Badge>
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

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Spawn animation ──────────────────────────────────────────────────────────

const AGENT_STEPS = [
  'Reading this week\'s competitive data…',
  'Analysing spend movements across 6 brands…',
  'Cross-referencing with your brand context…',
  'Identifying threats and opportunities…',
  'Generating prioritised recommendations…',
  'Brief ready ✓',
]

function AgentSpawnOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)

  useState(() => {
    const intervals = AGENT_STEPS.map((_, i) =>
      setTimeout(() => {
        setStep(i + 1)
        if (i === AGENT_STEPS.length - 1) setTimeout(onComplete, 600)
      }, i * 900 + 400)
    )
    return () => intervals.forEach(clearTimeout)
  })

  const progress = Math.round((step / AGENT_STEPS.length) * 100)

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-zinc-900 flex items-center justify-center animate-pulse">
            <Brain className="size-5 text-white" />
          </div>
          <div>
            <p className="font-semibold">Strategy Agent Running</p>
            <p className="text-xs text-muted-foreground">Analysing competitive landscape…</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-zinc-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-zinc-900 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2.5">
          {AGENT_STEPS.map((s, i) => (
            <div key={i} className={cn('flex items-center gap-2.5 transition-all', i < step ? 'opacity-100' : 'opacity-20')}>
              {i < step - 1 ? (
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              ) : i === step - 1 ? (
                <div className="size-3.5 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="size-3.5 rounded-full border border-zinc-200 shrink-0" />
              )}
              <span className={cn('text-xs', i === step - 1 ? 'text-foreground font-medium' : i < step ? 'text-muted-foreground' : 'text-zinc-300')}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StrategyView() {
  const [spawning, setSpawning]         = useState(false)
  const [briefReady, setBriefReady]     = useState(true)  // pre-loaded with mock data
  const [editingCtx, setEditingCtx]     = useState(false)
  const [context, setContext]           = useState(INITIAL_CONTEXT)
  const [draftCtx, setDraftCtx]         = useState(INITIAL_CONTEXT)
  const [expandedSection, setExpanded]  = useState<string | null>('recommendations')

  function spawnAgent() {
    setBriefReady(false)
    setSpawning(true)
  }

  function onSpawnComplete() {
    setSpawning(false)
    setBriefReady(true)
  }

  function saveContext() {
    setContext(draftCtx)
    setEditingCtx(false)
  }

  function toggleSection(s: string) {
    setExpanded(v => v === s ? null : s)
  }

  return (
    <div>
      {spawning && <AgentSpawnOverlay onComplete={onSpawnComplete} />}

      <SectionHeader
        title="Strategy Intelligence"
        description="AI Agent that reads daily analytics and generates strategic recommendations based on your brand context"
      >
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-700 text-white"
          onClick={spawnAgent}
        >
          <Zap className="size-3.5" />
          Spawn Agent
        </Button>
      </SectionHeader>

      {/* ── Agent status bar ── */}
      <div className="flex items-center gap-4 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className={cn('size-2 rounded-full', briefReady ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300')} />
          <span className="text-sm font-medium">{briefReady ? 'Agent ready' : 'Idle'}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Last run: today at 08:14
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5" />
          Next: tomorrow at 08:00
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="size-2.5" />
            {RECOMMENDATIONS.length} recommendations generated
          </Badge>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={spawnAgent}>
            <RefreshCcw className="size-3" />
            Re-run
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left: brief content (2 cols) ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Market position summary */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="size-4 text-zinc-500" />
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Strategic Brief · w/e 05 Apr 2026</span>
            </div>
            <p className="text-sm leading-relaxed text-white/90">
              ORLEN holds <strong className="text-white">13.7% share</strong> of estimated market spend (+1.1 pts w/w) with a Performance Index of <strong className="text-white">67</strong>, above the market average of 58. The primary threat this week is <strong className="text-white">Shell's aggressive Do-stage push on Google</strong> — 8 new ads with strong PI. The highest-value opportunity is the <strong className="text-white">unclaimed LinkedIn B2B fleet channel</strong> and a narrow window to enter Google Do-stage before Shell scales.
            </p>
            <div className="flex gap-3 mt-4">
              {[
                { label: 'Share', value: '13.7%', delta: '+1.1 pts', up: true },
                { label: 'PI Score', value: '67', delta: '+3 vs market', up: true },
                { label: 'New Ads', value: '6', delta: '+20%', up: true },
              ].map(m => (
                <div key={m.label} className="bg-white/10 rounded-lg px-3 py-2 flex-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">{m.label}</p>
                  <p className="text-lg font-bold text-white">{m.value}</p>
                  <p className={cn('text-[10px]', m.up ? 'text-emerald-400' : 'text-rose-400')}>{m.delta}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Threats */}
          <div>
            <button
              className="flex items-center justify-between w-full mb-3"
              onClick={() => toggleSection('threats')}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" />
                <p className="text-sm font-semibold">Top Threats</p>
                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">{THREATS.length}</Badge>
              </div>
              {expandedSection === 'threats' ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>
            {expandedSection === 'threats' && (
              <div className="space-y-3">
                {THREATS.map(t => (
                  <div key={t.id} className="bg-white rounded-lg border border-border shadow-sm p-4 flex gap-3">
                    <div className="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: BRAND_COLORS[t.brand] ?? '#888' }}>
                      {t.brand.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{t.brand}</span>
                        <Badge variant="outline" className={cn('text-[10px]', SEVERITY_CONFIG[t.severity].className)}>
                          {SEVERITY_CONFIG[t.severity].label} severity
                        </Badge>
                      </div>
                      <p className="text-xs font-medium mb-0.5">{t.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opportunities */}
          <div>
            <button
              className="flex items-center justify-between w-full mb-3"
              onClick={() => toggleSection('opportunities')}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-emerald-500" />
                <p className="text-sm font-semibold">Opportunities</p>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">{OPPORTUNITIES.length}</Badge>
              </div>
              {expandedSection === 'opportunities' ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>
            {expandedSection === 'opportunities' && (
              <div className="space-y-3">
                {OPPORTUNITIES.map(o => (
                  <div key={o.id} className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={cn('text-[10px]', POTENTIAL_CONFIG[o.potential].className)}>
                        {POTENTIAL_CONFIG[o.potential].label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">
                        {o.channel}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold mb-0.5">{o.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{o.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <button
              className="flex items-center justify-between w-full mb-3"
              onClick={() => toggleSection('recommendations')}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-zinc-500" />
                <p className="text-sm font-semibold">Recommended Actions</p>
                <Badge variant="outline" className="text-[10px] bg-rose-50 text-zinc-500 border-rose-200">{RECOMMENDATIONS.length}</Badge>
              </div>
              {expandedSection === 'recommendations' ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>
            {expandedSection === 'recommendations' && (
              <div className="space-y-3">
                {RECOMMENDATIONS.map(r => <RecommendationCard key={r.id} rec={r} />)}
              </div>
            )}
          </div>

          {/* Watch list */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Watch List — Next Week</p>
            </div>
            <div className="space-y-2.5">
              {WATCH_LIST.map(w => {
                const TrendIcon = TREND_ICONS[w.trend]
                return (
                  <div key={w.id} className="flex items-center gap-3">
                    <div className="size-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: BRAND_COLORS[w.brand] ?? '#888' }}>
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
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-4">

          {/* Agent context / training */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-zinc-500" />
                <p className="text-sm font-semibold">Agent Context</p>
              </div>
              {!editingCtx ? (
                <button
                  onClick={() => { setDraftCtx(context); setEditingCtx(true) }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Edit3 className="size-3" /> Edit
                </button>
              ) : (
                <button
                  onClick={saveContext}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                >
                  <Save className="size-3" /> Save
                </button>
              )}
            </div>

            <div className="space-y-3">
              {[
                { key: 'positioning', label: 'Brand positioning' },
                { key: 'goal', label: 'Strategic goal' },
                { key: 'primaryCompetitor', label: 'Primary competitor' },
                { key: 'budgetContext', label: 'Budget context' },
                { key: 'focusAreas', label: 'Focus areas' },
                { key: 'notes', label: 'Agent notes' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                  {editingCtx ? (
                    <textarea
                      value={draftCtx[key as keyof typeof draftCtx]}
                      onChange={e => setDraftCtx(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                      rows={key === 'positioning' || key === 'goal' || key === 'notes' ? 3 : 2}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">{context[key as keyof typeof context]}</p>
                  )}
                </div>
              ))}
            </div>

            {editingCtx && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button size="sm" className="w-full h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-700 text-white" onClick={saveContext}>
                  <Save className="size-3.5" />
                  Save & Retrain Agent
                </Button>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Agent Schedule</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Run frequency', value: 'Daily at 08:00' },
                { label: 'Analysis depth', value: 'Full (all brands)' },
                { label: 'Brief format', value: 'Strategic + Tactical' },
                { label: 'Auto-notify', value: 'Email on critical alerts' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Brief history */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Brief History</p>
            </div>
            <div className="space-y-3">
              {BRIEF_HISTORY.map((h, i) => (
                <div key={h.id} className={cn('pb-3 border-b border-border last:border-0 last:pb-0')}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium">{h.date}</span>
                    <Badge variant="outline" className="text-[10px]">{h.recCount} recs</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{h.summary}</p>
                  {i === 0 && (
                    <span className="text-[10px] text-zinc-500 font-medium">Current</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
