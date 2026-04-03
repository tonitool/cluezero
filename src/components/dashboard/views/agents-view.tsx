'use client'

import { Brain, TrendingUp, Search, ArrowRight, Zap, Lock } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AgentCard {
  id:           string
  icon:         React.ElementType
  name:         string
  tagline:      string
  description:  string
  capabilities: string[]
  status:       'active' | 'beta' | 'soon'
  color:        string
}

const AGENTS: AgentCard[] = [
  {
    id:          'performance',
    icon:        TrendingUp,
    name:        'Performance Marketing Manager',
    tagline:     'Reads live ad data. Spots threats. Recommends actions.',
    description: 'An AI agent with direct access to your competitive intelligence data. Ask it anything about spend, creatives, opportunities, or competitors — it uses real tools to fetch live data before answering.',
    capabilities: [
      'Competitive market overview & spend share analysis',
      'Brand deep-dives with spend trends and PI scoring',
      'Top & bottom creative analysis by funnel stage',
      'Whitespace opportunity identification',
      'Side-by-side brand comparisons',
    ],
    status: 'beta',
    color:  'indigo',
  },
  {
    id:          'coordinator',
    icon:        Brain,
    name:        'Marketing Coordinator',
    tagline:     'Turns insights into tasks in your project tools.',
    description: 'Takes strategy briefs and competitive insights and creates structured action plans in Asana, Notion, or ClickUp — with deadlines, owners, and priorities already set.',
    capabilities: [
      'Auto-create tasks from Strategy Intelligence briefs',
      'Weekly competitive summary sent to Slack',
      'Campaign briefing docs pushed to Notion',
      'Asana project setup for new campaign launches',
    ],
    status: 'soon',
    color:  'violet',
  },
  {
    id:          'seo',
    icon:        Search,
    name:        'SEO Auditor',
    tagline:     'Audits your landing pages against competitor content.',
    description: 'Crawls your key landing pages, compares them against competitor ad destinations, identifies content gaps, and suggests keyword opportunities aligned with your ad funnel.',
    capabilities: [
      'Landing page content audit vs competitor destinations',
      'Keyword gap analysis from ad headlines',
      'Funnel alignment check (ad → landing page)',
      'Weekly SEO health report',
    ],
    status: 'soon',
    color:  'emerald',
  },
]

const STATUS_CONFIG = {
  active: { label: 'Active',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  beta:   { label: 'Beta',          className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  soon:   { label: 'Coming soon',   className: 'bg-zinc-50 text-zinc-500 border-zinc-200' },
}

const COLOR_CONFIG: Record<string, { bg: string; icon: string; ring: string }> = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  ring: 'ring-indigo-100' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'ring-violet-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
}

interface Props {
  onNavigate?: (view: string) => void
}

export function AgentsView({ onNavigate }: Props) {
  return (
    <div>
      <SectionHeader
        title="Agent Hub"
        description="AI agents that read your data, reason about it, and take actions on your behalf"
      />

      {/* Explainer banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl p-5 mb-6 text-white">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">What makes these agents different</p>
            <p className="text-xs text-white/70 leading-relaxed max-w-2xl">
              Unlike the AI chat or one-shot briefs, these agents operate in a loop — they decide which tools to call, fetch real data, reason about it, then act. They can make multiple API calls in sequence before giving you a final answer, and (soon) take actions like creating tasks or adjusting budgets.
            </p>
          </div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {AGENTS.map(agent => {
          const colors  = COLOR_CONFIG[agent.color] ?? COLOR_CONFIG.indigo
          const status  = STATUS_CONFIG[agent.status]
          const Icon    = agent.icon
          const isReady = agent.status !== 'soon'

          return (
            <div
              key={agent.id}
              className={cn(
                'bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden transition-all',
                isReady ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'opacity-70'
              )}
              onClick={() => isReady && onNavigate?.(`agent-${agent.id}`)}
            >
              {/* Header */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('size-11 rounded-xl flex items-center justify-center ring-4', colors.bg, colors.ring)}>
                    <Icon className={cn('size-5', colors.icon)} />
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] font-medium', status.className)}>
                    {status.label}
                  </Badge>
                </div>

                <p className="text-sm font-semibold leading-snug mb-1">{agent.name}</p>
                <p className="text-xs text-muted-foreground leading-snug mb-3">{agent.tagline}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{agent.description}</p>
              </div>

              {/* Capabilities */}
              <div className="px-5 pb-4 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Capabilities</p>
                <ul className="space-y-1.5">
                  {agent.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                      <span className={cn('size-1.5 rounded-full mt-1.5 shrink-0', isReady ? colors.icon.replace('text-', 'bg-') : 'bg-zinc-300')} />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className={cn('px-5 py-3.5 border-t border-border', colors.bg)}>
                {isReady ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{}}>
                    <span className={colors.icon}>Launch agent</span>
                    <ArrowRight className={cn('size-3.5', colors.icon)} />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Lock className="size-3" />
                    Requires connection setup
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Roadmap note */}
      <div className="mt-6 bg-zinc-50 rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-foreground mb-1">What's coming</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The Marketing Coordinator and SEO Auditor agents require connecting your productivity tools (Asana, Notion, Slack) and SEO data sources. These connection flows are in development. The Performance Marketing Manager is available now — it works with your existing Snowflake data.
        </p>
      </div>
    </div>
  )
}
