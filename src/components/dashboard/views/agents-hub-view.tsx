'use client'

import { useState } from 'react'
import { Eye, TrendingUp, Brain, MessageSquare } from 'lucide-react'
import { AgentsView }           from './agents-view'
import { PerformanceAgentView } from './performance-agent-view'
import { StrategyView }         from './strategy-view'
import { AiInsightsView }       from './ai-insights-view'
import { cn } from '@/lib/utils'

type AgentTab = 'watch' | 'performance' | 'strategy' | 'ask'

interface Props {
  workspaceId?:  string
  ownBrand?:     string
  connectionId?: string
}

const TABS: { id: AgentTab; label: string; icon: React.ElementType; sub: string }[] = [
  { id: 'watch',       label: 'Watch Agent',       icon: Eye,           sub: 'Competitive monitoring & weekly alerts' },
  { id: 'performance', label: 'Performance Brief',  icon: TrendingUp,    sub: 'Campaign & market analysis' },
  { id: 'strategy',    label: 'Strategy',           icon: Brain,         sub: 'AI-generated strategic briefs' },
  { id: 'ask',         label: 'Ask AI',             icon: MessageSquare, sub: 'Ad-hoc competitive questions' },
]

export function AgentsHubView({ workspaceId, ownBrand, connectionId }: Props) {
  const [tab, setTab] = useState<AgentTab>('watch')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-300'
            )}
          >
            <t.icon className="size-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'watch' && (
        <AgentsView
          workspaceId={workspaceId}
          connectionId={connectionId}
          onNavigate={() => setTab('performance')}
        />
      )}
      {tab === 'performance' && (
        <PerformanceAgentView
          workspaceId={workspaceId}
          ownBrand={ownBrand}
          connectionId={connectionId}
          onBack={() => setTab('watch')}
        />
      )}
      {tab === 'strategy' && (
        <StrategyView
          workspaceId={workspaceId}
          ownBrand={ownBrand}
          onNavigate={() => setTab('watch')}
        />
      )}
      {tab === 'ask' && (
        <AiInsightsView
          workspaceId={workspaceId}
          ownBrand={ownBrand}
          connectionId={connectionId}
        />
      )}
    </div>
  )
}
