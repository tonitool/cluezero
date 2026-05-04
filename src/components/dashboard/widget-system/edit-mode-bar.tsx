'use client'

import { Plus, Check, X, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WidgetConfig } from './types'
import { BUILTIN_WIDGETS } from './types'

interface Props {
  tab: string
  configs: WidgetConfig[]
  onAddWidget: () => void
  onDone: () => void
  onCancel: () => void
  saving: boolean
}

export function EditModeBar({ tab, configs, onAddWidget, onDone, onCancel, saving }: Props) {
  const totalBuiltin  = (BUILTIN_WIDGETS[tab] ?? []).length
  const hiddenCount   = configs.filter(c => c.type === 'builtin' && !c.isVisible).length
  const sqlCount      = configs.filter(c => c.type === 'sql').length

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-2.5 bg-zinc-900 text-white rounded-xl mb-5 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-sm font-medium">Editing layout</span>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{totalBuiltin - hiddenCount}/{totalBuiltin} built-in widgets visible</span>
          {hiddenCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <EyeOff className="size-3" />
              {hiddenCount} hidden
            </span>
          )}
          {sqlCount > 0 && (
            <span className="text-zinc-300">{sqlCount} SQL widget{sqlCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white"
          onClick={onAddWidget}
        >
          <Plus className="size-3.5" />
          Add SQL widget
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={onCancel}
        >
          <X className="size-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 gap-1.5 text-xs bg-white text-zinc-900 hover:bg-zinc-100"
          onClick={onDone}
          disabled={saving}
        >
          <Check className="size-3.5" />
          Done
        </Button>
      </div>
    </div>
  )
}
