'use client'

import { useState } from 'react'
import { LayoutDashboard, TrendingUp, Users, BarChart3, Sparkles, ImageIcon } from 'lucide-react'
import { OverviewView }        from './overview-view'
import { MovementView }        from './movement-view'
import { CompetitiveView }     from './competitive-view'
import { PerformanceView }     from './performance-view'
import { OrlenView }           from './orlen-view'
import { CreativeLibraryView } from './creative-library-view'
import { cn } from '@/lib/utils'

type IntelTab = 'overview' | 'movement' | 'competitive' | 'performance' | 'brand' | 'creative'

interface Props {
  workspaceId?:  string
  ownBrand?:     string
  connectionId?: string
  initialTab?:   IntelTab
}

const TABS: { id: IntelTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'movement',    label: 'Weekly',      icon: TrendingUp },
  { id: 'competitive', label: 'Competitive', icon: Users },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'brand',       label: 'Brand',       icon: Sparkles },
  { id: 'creative',    label: 'Creative',    icon: ImageIcon },
]

export function IntelligenceHubView({ workspaceId, ownBrand, connectionId, initialTab = 'overview' }: Props) {
  const [tab, setTab] = useState<IntelTab>(initialTab)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0.5 mb-6 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
              tab === t.id
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-300'
            )}
          >
            <t.icon className="size-3.5 shrink-0" />
            {t.id === 'brand' && ownBrand ? ownBrand : t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'    && <OverviewView       workspaceId={workspaceId} connectionId={connectionId} />}
      {tab === 'movement'    && <MovementView        workspaceId={workspaceId} connectionId={connectionId} />}
      {tab === 'competitive' && <CompetitiveView     workspaceId={workspaceId} connectionId={connectionId} />}
      {tab === 'performance' && <PerformanceView     workspaceId={workspaceId} connectionId={connectionId} />}
      {tab === 'brand'       && <OrlenView           workspaceId={workspaceId} ownBrand={ownBrand} connectionId={connectionId} />}
      {tab === 'creative'    && <CreativeLibraryView workspaceId={workspaceId} connectionId={connectionId} onNavigate={() => {}} />}
    </div>
  )
}
