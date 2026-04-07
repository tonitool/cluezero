'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Loader2, LayoutDashboard, ArrowRight,
  GripVertical, Pencil, Check, X,
  Columns2, Square, ChevronUp, ChevronDown,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { ChartRenderer, DataPoint } from '@/components/dashboard/_components/chart-renderer'
import { METRICS, DIMENSIONS } from '@/lib/metrics'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tile {
  id:         string
  title:      string
  metric_a:   string
  metric_b:   string | null
  dimension:  string
  chart_type: string
  week_range: number
  col_span:   number
  filters:    { row_span?: number } & Record<string, unknown>
}

// ─── TileCard ─────────────────────────────────────────────────────────────────

interface TileCardProps {
  tile:          Tile
  workspaceId:   string
  connectionId?: string
  onDelete:      (id: string) => void
  onUpdate:      (id: string, patch: Partial<Tile>) => void
  isDragging?:   boolean
}

function TileCard({ tile, workspaceId, connectionId, onDelete, onUpdate, isDragging }: TileCardProps) {
  const [data,       setData]      = useState<DataPoint[]>([])
  const [loading,    setLoading]   = useState(true)
  const [deleting,   setDeleting]  = useState(false)
  const [renaming,   setRenaming]  = useState(false)
  const [titleDraft, setTitleDraft]= useState(tile.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const rowSpan   = (tile.filters?.row_span as number) ?? 1
  const chartH    = rowSpan === 2 ? 380 : 200

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: tile.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.35 : 1,
  }

  useEffect(() => {
    fetch('/api/data/explore', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        metricA:   tile.metric_a,
        metricB:   tile.metric_b ?? undefined,
        dimension: tile.dimension,
        weekRange: tile.week_range,
        connectionId,
      }),
    })
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
      .finally(() => setLoading(false))
  }, [tile, workspaceId, connectionId])

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/dashboard/tiles?id=${tile.id}&workspaceId=${workspaceId}`, { method: 'DELETE' })
    onDelete(tile.id)
  }

  async function handleRenameConfirm() {
    const newTitle = titleDraft.trim() || tile.title
    setRenaming(false)
    if (newTitle === tile.title) return
    onUpdate(tile.id, { title: newTitle })
    await fetch('/api/dashboard/tiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, id: tile.id, title: newTitle }),
    })
  }

  function handleRenameCancel() {
    setTitleDraft(tile.title)
    setRenaming(false)
  }

  async function toggleColSpan() {
    const next = tile.col_span === 2 ? 1 : 2
    onUpdate(tile.id, { col_span: next })
    await fetch('/api/dashboard/tiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, id: tile.id, colSpan: next }),
    })
  }

  async function toggleRowSpan() {
    const next = rowSpan === 2 ? 1 : 2
    const newFilters = { ...tile.filters, row_span: next }
    onUpdate(tile.id, { filters: newFilters })
    await fetch('/api/dashboard/tiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, id: tile.id, filters: newFilters }),
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white border border-border rounded-xl shadow-sm overflow-hidden group flex flex-col',
        tile.col_span === 2 ? 'col-span-2' : 'col-span-1',
        isDragging && 'shadow-xl ring-2 ring-indigo-400'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border/60 shrink-0">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="size-3.5" />
        </button>

        {/* Title / rename */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') handleRenameCancel() }}
                className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-b border-indigo-400 outline-none py-0.5"
              />
              <button onClick={handleRenameConfirm} className="p-0.5 text-emerald-600 hover:text-emerald-700"><Check className="size-3.5" /></button>
              <button onClick={handleRenameCancel}  className="p-0.5 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
            </div>
          ) : (
            <p className="text-sm font-semibold truncate">{tile.title}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {METRICS[tile.metric_a]?.label}
            {tile.metric_b && ` vs ${METRICS[tile.metric_b]?.label}`}
            {' · '}{DIMENSIONS[tile.dimension]?.label}
            {' · '}Last {tile.week_range}w
          </p>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {/* Rename */}
          <button
            onClick={() => { setTitleDraft(tile.title); setRenaming(true) }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Rename"
          >
            <Pencil className="size-3" />
          </button>

          {/* Toggle width */}
          <button
            onClick={toggleColSpan}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title={tile.col_span === 2 ? 'Narrow (half width)' : 'Wide (full width)'}
          >
            {tile.col_span === 2 ? <Square className="size-3" /> : <Columns2 className="size-3" />}
          </button>

          {/* Toggle height */}
          <button
            onClick={toggleRowSpan}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title={rowSpan === 2 ? 'Short' : 'Tall'}
          >
            {rowSpan === 2 ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete} disabled={deleting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-colors"
            title="Remove"
          >
            {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: chartH }}>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ChartRenderer
            data={data}
            chartType={tile.chart_type}
            metricA={tile.metric_a}
            metricB={tile.metric_b ?? undefined}
            height={chartH}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface Props {
  workspaceId?:  string
  connectionId?: string
  onNavigate?:   (view: string) => void
}

export function MyDashboardView({ workspaceId, connectionId, onNavigate }: Props) {
  const [tiles,       setTiles]       = useState<Tile[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeTile,  setActiveTile]  = useState<Tile | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const loadTiles = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    const res = await fetch(`/api/dashboard/tiles?workspaceId=${workspaceId}`)
    const d   = await res.json()
    setTiles(d.tiles ?? [])
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { loadTiles() }, [loadTiles])

  function handleDelete(id: string) {
    setTiles(prev => prev.filter(t => t.id !== id))
  }

  function handleUpdate(id: string, patch: Partial<Tile>) {
    setTiles(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function handleDragStart(event: DragStartEvent) {
    const tile = tiles.find(t => t.id === event.active.id)
    setActiveTile(tile ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTile(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = tiles.findIndex(t => t.id === active.id)
    const newIdx = tiles.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tiles, oldIdx, newIdx)
    setTiles(reordered)

    // Persist positions
    await fetch('/api/dashboard/tiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        positions: reordered.map((t, i) => ({ id: t.id, position: i })),
      }),
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <SectionHeader
          title="My Dashboard"
          description="Your saved charts — drag to reorder, hover a tile to resize or rename"
        />
        <Button
          size="sm" className="h-8 gap-1.5 text-xs shrink-0 mt-1"
          onClick={() => onNavigate?.('explore')}
        >
          <Plus className="size-3.5" />
          Add Chart
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && tiles.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="size-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <LayoutDashboard className="size-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">No charts yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Go to Explorer, build a visualisation you like, and save it here.
            </p>
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onNavigate?.('explore')}>
            <ArrowRight className="size-3.5" /> Open Explorer
          </Button>
        </div>
      )}

      {!loading && tiles.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tiles.map(t => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4">
              {tiles.map(tile => (
                <TileCard
                  key={tile.id}
                  tile={tile}
                  workspaceId={workspaceId ?? ''}
                  connectionId={connectionId}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          </SortableContext>

          {/* Ghost tile while dragging */}
          <DragOverlay>
            {activeTile && (
              <div className={cn(
                'bg-white border-2 border-indigo-400 rounded-xl shadow-2xl opacity-90 p-4',
                activeTile.col_span === 2 ? 'col-span-2' : 'col-span-1'
              )}>
                <p className="text-sm font-semibold">{activeTile.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{METRICS[activeTile.metric_a]?.label}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
