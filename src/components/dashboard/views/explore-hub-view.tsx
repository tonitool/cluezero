'use client'

import { useState } from 'react'
import { LineChart, LayoutGrid } from 'lucide-react'
import { ExploreView }     from './explore-view'
import { MyDashboardView } from './my-dashboard-view'
import { cn } from '@/lib/utils'

type ExploreTab = 'explore' | 'dashboard'

interface Props {
  workspaceId?:  string
  connectionId?: string
  initialTab?:   ExploreTab
}

export function ExploreHubView({ workspaceId, connectionId, initialTab = 'explore' }: Props) {
  const [tab, setTab] = useState<ExploreTab>(initialTab)

  return (
    <div>
      <div className="flex gap-0.5 mb-6 border-b border-border">
        <button
          onClick={() => setTab('explore')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'explore'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-300'
          )}
        >
          <LineChart className="size-3.5" />
          Explorer
        </button>
        <button
          onClick={() => setTab('dashboard')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-300'
          )}
        >
          <LayoutGrid className="size-3.5" />
          My Dashboard
        </button>
      </div>

      {tab === 'explore'   && (
        <ExploreView
          workspaceId={workspaceId}
          connectionId={connectionId}
          onNavigate={(v) => { if (v === 'my-dashboard') setTab('dashboard') }}
        />
      )}
      {tab === 'dashboard' && (
        <MyDashboardView
          workspaceId={workspaceId}
          connectionId={connectionId}
          onNavigate={(v) => { if (v === 'explore') setTab('explore') }}
        />
      )}
    </div>
  )
}
