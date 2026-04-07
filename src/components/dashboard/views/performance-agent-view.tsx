'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, RefreshCcw, ArrowLeft, Loader2,
  AlertCircle, ArrowRight, Zap, Target, BarChart3, Lightbulb,
  CheckCircle2, ChevronRight, Plug,
} from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PerformanceBrief } from '@/app/api/agents/performance/brief/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtEur(n: number) {
  if (n >= 1000) return `€${fmt(n / 1000, 1)}k`
  return `€${fmt(n, 0)}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const PRIORITY_CONFIG = {
  high:   { label: 'High',   className: 'bg-rose-50 text-rose-700 border-rose-200' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { label: 'Low',    className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
}

const OPPORTUNITY_ICONS = {
  funnel:   Target,
  platform: Plug,
  topic:    Lightbulb,
  budget:   BarChart3,
}

// ─── Section skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-zinc-100 animate-pulse rounded-md', className)} />
}

function BriefSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section: Account Health ──────────────────────────────────────────────────

function AccountHealthSection({ data }: { data: PerformanceBrief['accountHealth'] }) {
  if (!data.hasConnectedAccounts) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Account Health</p>
        <div className="flex items-start gap-3 bg-zinc-50 rounded-lg p-4 border border-dashed border-border">
          <Plug className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">No ad accounts connected</p>
            <p className="text-xs text-muted-foreground mt-0.5">Connect your Google Ads or Meta Ads account in Connections to see live campaign performance here.</p>
          </div>
        </div>
      </div>
    )
  }

  const metrics = [
    { label: 'Total Spend',   value: fmtEur(data.totalSpend),          sub: 'last 30 days' },
    { label: 'ROAS',          value: data.roas ? `${data.roas}x` : '—', sub: 'return on ad spend' },
    { label: 'Clicks',        value: fmt(data.clicks),                  sub: 'last 30 days' },
    { label: 'Conversions',   value: fmt(data.conversions),             sub: 'last 30 days' },
  ]

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account Health</p>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
          <CheckCircle2 className="size-3" /> Live
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-zinc-50 rounded-lg px-3 py-3 border border-zinc-100">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
            <p className="text-lg font-semibold mt-0.5 tabular-nums">{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {data.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">{data.summary}</p>
      )}

      {data.platforms.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-3">
          {data.platforms.map(p => (
            <div key={p.name} className="text-[11px] bg-white border border-border rounded-full px-2.5 py-1 text-muted-foreground">
              {p.name}: {fmtEur(p.spend)} · {p.campaigns} campaigns
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section: Market Position ─────────────────────────────────────────────────

function MarketPositionSection({ data }: { data: PerformanceBrief['marketPosition'] }) {
  const hasData = data.totalBrands > 0

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Market Position</p>
        <p className="text-xs text-muted-foreground">No competitive data yet. Sync a data source first.</p>
      </div>
    )
  }

  const wowPositive = data.wowChange?.startsWith('+') || (data.wowChange && !data.wowChange.startsWith('-'))
  const aboveMarket  = data.piScore != null && data.marketAvgPi != null && data.piScore > data.marketAvgPi

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Market Position</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-zinc-50 rounded-lg px-3 py-3 border border-zinc-100">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spend Rank</p>
          <p className="text-lg font-semibold mt-0.5">
            {data.spendRank ? `#${data.spendRank}` : '—'}
            <span className="text-xs font-normal text-muted-foreground ml-1">of {data.totalBrands}</span>
          </p>
        </div>
        <div className="bg-zinc-50 rounded-lg px-3 py-3 border border-zinc-100">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spend Share</p>
          <p className="text-lg font-semibold mt-0.5 tabular-nums">
            {data.spendShare != null ? `${data.spendShare}%` : '—'}
          </p>
          {data.wowChange && (
            <p className={cn('text-[10px] mt-0.5 flex items-center gap-0.5', wowPositive ? 'text-emerald-600' : 'text-rose-600')}>
              {wowPositive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {data.wowChange} WoW
            </p>
          )}
        </div>
        <div className="bg-zinc-50 rounded-lg px-3 py-3 border border-zinc-100">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Perf. Index</p>
          <p className="text-lg font-semibold mt-0.5 tabular-nums">{data.piScore ?? '—'}</p>
          <p className={cn('text-[10px] mt-0.5', aboveMarket ? 'text-emerald-600' : 'text-zinc-400')}>
            avg {data.marketAvgPi ?? '—'} {aboveMarket ? '↑ above' : '↓ below'}
          </p>
        </div>
        <div className="bg-zinc-50 rounded-lg px-3 py-3 border border-zinc-100">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Weekly Spend</p>
          <p className="text-lg font-semibold mt-0.5 tabular-nums">
            {data.weeklySpend != null ? fmtEur(data.weeklySpend) : '—'}
          </p>
        </div>
      </div>

      {data.competitors.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Competitors</p>
          <div className="space-y-2">
            {data.competitors.map(c => (
              <div key={c.name} className="flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium truncate">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{c.share}% · PI {c.pi ?? '—'} · {c.newAds} new</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-200 rounded-full"
                      style={{ width: `${Math.min(c.share * 2, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Section: Opportunities ───────────────────────────────────────────────────

function OpportunitiesSection({ data }: { data: PerformanceBrief['opportunities'] }) {
  if (!data.length) return null

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Opportunities</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((opp, i) => {
          const Icon = OPPORTUNITY_ICONS[opp.type] ?? Lightbulb
          return (
            <div key={i} className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-3">
              <div className="size-7 rounded-md bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="size-3.5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-900">{opp.title}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">{opp.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Section: Recommendations ─────────────────────────────────────────────────

function RecommendationsSection({ data }: { data: PerformanceBrief['recommendations'] }) {
  if (!data.length) return null

  const sorted = [...data].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Recommendations</p>
      <div className="space-y-3">
        {sorted.map((rec, i) => {
          const cfg = PRIORITY_CONFIG[rec.priority]
          return (
            <div key={i} className="flex items-start gap-3 border border-border rounded-lg px-4 py-3">
              <Badge variant="outline" className={cn('text-[10px] font-semibold shrink-0 mt-0.5', cfg.className)}>
                {cfg.label}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.rationale}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-indigo-600">
                  <ChevronRight className="size-3 shrink-0" />
                  <span>{rec.action}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  workspaceId?:  string
  ownBrand?:     string
  connectionId?: string
  onBack?:       () => void
}

export function PerformanceAgentView({ workspaceId, ownBrand, connectionId, onBack }: Props) {
  const brandLabel = ownBrand || 'Your Brand'
  const [brief,     setBrief]     = useState<PerformanceBrief | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const runBrief = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/performance/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, connectionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate brief')
      setBrief(data as PerformanceBrief)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, connectionId])

  useEffect(() => {
    if (workspaceId) runBrief()
  }, [workspaceId, runBrief])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          {onBack && (
            <button onClick={onBack} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <SectionHeader
            title="Performance Brief"
            description={`Weekly AI-generated analysis for ${brandLabel} — competitive position, own account health, and what to do next`}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {brief?.generatedAt && !loading && (
            <span className="text-[11px] text-muted-foreground">Updated {timeAgo(brief.generatedAt)}</span>
          )}
          <Button
            variant="outline" size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={runBrief}
            disabled={loading || !workspaceId}
          >
            {loading
              ? <><Loader2 className="size-3 animate-spin" /> Analysing…</>
              : <><RefreshCcw className="size-3" /> Refresh</>
            }
          </Button>
        </div>
      </div>

      {/* No workspace */}
      {!workspaceId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
          <AlertCircle className="size-3.5 shrink-0" />
          No workspace connected. Log in and select a workspace to run this brief.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-xs text-rose-700 mb-4">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Analysis failed</p>
            <p className="mt-0.5 text-rose-600">{error}</p>
            <button className="mt-1.5 flex items-center gap-1 underline" onClick={runBrief}>
              <RefreshCcw className="size-3" /> Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !brief && <BriefSkeleton />}

      {/* Brief content */}
      {brief && (
        <div className="space-y-5">
          {/* Running indicator overlay on refresh */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <Zap className="size-3.5" />
              Refreshing analysis — showing last brief below
            </div>
          )}

          <AccountHealthSection    data={brief.accountHealth} />
          <MarketPositionSection   data={brief.marketPosition} />
          <OpportunitiesSection    data={brief.opportunities} />
          <RecommendationsSection  data={brief.recommendations} />

          {/* Footer */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pb-2">
            <ArrowRight className="size-3" />
            Brief generated by Claude · {new Date(brief.generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  )
}
