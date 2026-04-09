'use client'

import { Eye, EyeOff, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  widgetId: string
  editMode: boolean
  isVisible: boolean
  onToggle: () => void
  children: React.ReactNode
  colSpan?: 1 | 2
  className?: string
}

export function WidgetWrapper({
  widgetId, editMode, isVisible, onToggle, children, colSpan = 1, className,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widgetId, disabled: !editMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (!editMode && !isVisible) return null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        colSpan === 2 ? 'col-span-2' : 'col-span-1',
        isDragging && 'z-50 opacity-80',
        !isVisible && editMode && 'opacity-40',
        className,
      )}
    >
      {children}

      {/* Edit mode overlay */}
      {editMode && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-zinc-900/20 pointer-events-none" />
      )}

      {/* Controls shown in edit mode */}
      {editMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 pointer-events-auto">
          {/* Drag handle */}
          <button
            {...listeners}
            {...attributes}
            className="p-1.5 rounded-md bg-white/90 border border-border shadow-sm text-zinc-400 hover:text-zinc-700 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </button>
          {/* Visibility toggle */}
          <button
            onClick={onToggle}
            className={cn(
              'p-1.5 rounded-md bg-white/90 border border-border shadow-sm transition-colors',
              isVisible
                ? 'text-zinc-400 hover:text-zinc-700'
                : 'text-rose-500 hover:text-rose-700',
            )}
            title={isVisible ? 'Hide widget' : 'Show widget'}
          >
            {isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
