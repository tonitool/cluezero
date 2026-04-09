'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, TrendingUp, Users, BarChart3, Sparkles, ImageIcon, Pencil } from 'lucide-react'
import { OverviewView }        from './overview-view'
import { MovementView }        from './movement-view'
import { CompetitiveView }     from './competitive-view'
import { PerformanceView }     from './performance-view'
import { OrlenView }           from './orlen-view'
import { CreativeLibraryView } from './creative-library-view'
import { cn } from '@/lib/utils'

export type IntelTab = 'overview' | 'movement' | 'competitive' | 'performance' | 'brand' | 'creative'

export const INTEL_TABS: { id: IntelTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'movement',    label: 'Weekly',      icon: TrendingUp },
  { id: 'competitive', label: 'Competitive', icon: Users },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'brand',       label: 'Brand',       icon: Sparkles },
  { id: 'creative',    label: 'Creative',    icon: ImageIcon },
]

interface Props {
  workspaceId?:    string
  ownBrand?:       string
  connectionId?:   string
  activeTab?:      IntelTab
  initialTab?:     IntelTab
  hideTabs?:       boolean
  canEdit?:        boolean
  dateFrom?:       string
  dateTo?:         string
  datePeriod?:     'week' | 'month' | 'year'
}

export function IntelligenceHubView({
  workspaceId, ownBrand, connectionId,
  activeTab, initialTab = 'overview',
  hideTabs = false,
  canEdit = true,
  dateFrom, dateTo, datePeriod,
}: Props) {
  // If activeTab is provided externally, use it (controlled); else use local state
  const [localTab, setLocalTab] = useState<IntelTab>(initialTab)
  const tab = activeTab ?? localTab

  // Keep localTab in sync when activeTab changes
  useEffect(() => {
    if (activeTab) setLocalTab(activeTab)
  }, [activeTab])

  const [editMode, setEditMode] = useState(false)

  function handleTabChange(next: IntelTab) {
    setEditMode(false)
    if (!activeTab) setLocalTab(next)
  }

  return (
    <div>
      {/* Internal tab bar — hidden when sidebar drives navigation */}
      {!hideTabs && (
        <div className="flex items-center gap-0.5 mb-6 border-b border-border overflow-x-auto">
          {INTEL_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
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

          {canEdit && workspaceId && (
            <div className="ml-auto pl-4 shrink-0 self-center">
              <button
                onClick={() => setEditMode(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  editMode
                    ? 'bg-zinc-900 text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100'
                )}
              >
                <Pencil className="size-3" />
                {editMode ? 'Editing…' : 'Edit layout'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit layout button when tabs are hidden (sidebar mode) */}
      {hideTabs && canEdit && workspaceId && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setEditMode(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              editMode
                ? 'bg-zinc-900 text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100 border border-border'
            )}
          >
            <Pencil className="size-3" />
            {editMode ? 'Editing…' : 'Edit layout'}
          </button>
        </div>
      )}

      {tab === 'overview'    && <OverviewView    workspaceId={workspaceId} connectionId={connectionId} editMode={editMode} onEditModeChange={setEditMode} dateFrom={dateFrom} dateTo={dateTo} datePeriod={datePeriod} />}
      {tab === 'movement'    && <MovementView    workspaceId={workspaceId} connectionId={connectionId} editMode={editMode} onEditModeChange={setEditMode} dateFrom={dateFrom} dateTo={dateTo} datePeriod={datePeriod} />}
      {tab === 'competitive' && <CompetitiveView workspaceId={workspaceId} connectionId={connectionId} editMode={editMode} onEditModeChange={setEditMode} dateFrom={dateFrom} dateTo={dateTo} datePeriod={datePeriod} />}
      {tab === 'performance' && <PerformanceView workspaceId={workspaceId} connectionId={connectionId} editMode={editMode} onEditModeChange={setEditMode} dateFrom={dateFrom} dateTo={dateTo} datePeriod={datePeriod} />}
      {tab === 'brand'       && <OrlenView       workspaceId={workspaceId} ownBrand={ownBrand} connectionId={connectionId} editMode={editMode} onEditModeChange={setEditMode} dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'creative'    && <CreativeLibraryView workspaceId={workspaceId} connectionId={connectionId} onNavigate={() => {}} editMode={editMode} onEditModeChange={setEditMode} />}
    </div>
  )
}
