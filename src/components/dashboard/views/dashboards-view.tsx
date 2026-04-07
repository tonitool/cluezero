'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Loader2, LayoutDashboard, Pencil, Check, X, ArrowRight,
  GripVertical, Columns2, Square, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { ChartRenderer, DataPoint } from '@/components/dashboard/_components/chart-renderer'
import { METRICS, DIMENSIONS } from '@/lib/metrics'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dashboard { id: string; name: string; position: number }

interface Tile {
  id:          string
  title:       string
  metric_a:    string
  metric_b:    string | null
  dimension:   string
  chart_type:  string
  week_range:  number
  col_span:    number
  filters:     { row_span?: number } & Record<string, unknown>
  dashboard_id: string | null
}

// ─── Tile card (same as my-dashboard-view but with dashboard_id awareness) ────

interface TileCardProps {
  tile:          Tile
  workspaceId:   string
  connectionId?: string
  onDelete:      (id: string) => void
  onUpdate:      (id: string, patch: Partial<Tile>) => void
}

function TileCard({ tile, workspaceId, connectionId, onDelete, onUpdate }: TileCardProps) {
  const [data,       setData]      = useState<DataPoint[]>([])
  const [loading,    setLoading]   = useState(true)
  const [deleting,   setDeleting]  = useState(false)
  const [renaming,   setRenaming]  = useState(false)
  const [titleDraft, setTitleDraft]= useState(tile.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const rowSpan  = (tile.filters?.row_span as number) ?? 1
  const chartH   = rowSpan === 2 ? 380 : 200

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }

  useEffect(() => {
    fetch('/api/data/explore', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId, connectionId,
        metricA: tile.metric_a, metricB: tile.metric_b ?? undefined,
        dimension: tile.dimension, weekRange: tile.week_range,
      }),
    }).then(r => r.json()).then(d => setData(d.data ?? [])).finally(() => setLoading(false))
  }, [tile, workspaceId, connectionId])

  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])

  async function save(patch: Partial<Tile> & { colSpan?: number; filters?: Record<string, unknown> }) {
    const { colSpan, filters, ...rest } = patch
    onUpdate(tile.id, rest as Partial<Tile>)
    await fetch('/api/dashboard/tiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, id: tile.id, ...patch }),
    })
  }

  async function confirmRename() {
    const t = titleDraft.trim() || tile.title
    setRenaming(false)
    if (t !== tile.title) await save({ title: t })
  }

  return (
    <div ref={setNodeRef} style={style}
      className={cn('bg-white border border-border rounded-xl shadow-sm overflow-hidden group flex flex-col',
        tile.col_span === 2 ? 'col-span-2' : 'col-span-1')}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border/60 shrink-0">
        <button {...attributes} {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-muted-foreground/30 hover:text-muted-foreground touch-none">
          <GripVertical className="size-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1">
              <input ref={inputRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') { setTitleDraft(tile.title); setRenaming(false) } }}
                className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-b border-zinc-900 outline-none py-0.5" />
              <button onClick={confirmRename}><Check className="size-3.5 text-emerald-600" /></button>
              <button onClick={() => { setTitleDraft(tile.title); setRenaming(false) }}><X className="size-3.5 text-zinc-400" /></button>
            </div>
          ) : (
            <p className="text-sm font-semibold truncate">{tile.title}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {METRICS[tile.metric_a]?.label}{tile.metric_b && ` vs ${METRICS[tile.metric_b]?.label}`}
            {' · '}{DIMENSIONS[tile.dimension]?.label}{' · '}Last {tile.week_range}w
          </p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => { setTitleDraft(tile.title); setRenaming(true) }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100" title="Rename">
            <Pencil className="size-3" />
          </button>
          <button onClick={() => save({ col_span: tile.col_span === 2 ? 1 : 2, colSpan: tile.col_span === 2 ? 1 : 2 })}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100"
            title={tile.col_span === 2 ? 'Half width' : 'Full width'}>
            {tile.col_span === 2 ? <Square className="size-3" /> : <Columns2 className="size-3" />}
          </button>
          <button onClick={() => { const r = rowSpan === 2 ? 1 : 2; save({ filters: { ...tile.filters, row_span: r } }) }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100"
            title={rowSpan === 2 ? 'Short' : 'Tall'}>
            {rowSpan === 2 ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          <button onClick={async () => { setDeleting(true); await fetch(`/api/dashboard/tiles?id=${tile.id}&workspaceId=${workspaceId}`, { method: 'DELETE' }); onDelete(tile.id) }}
            disabled={deleting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50">
            {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          </button>
        </div>
      </div>
      <div className="p-4 flex-1">
        {loading ? (
          <div className="rounded-xl bg-zinc-50 animate-pulse" style={{ height: chartH }} />
        ) : (
          <ChartRenderer data={data} chartType={tile.chart_type}
            metricA={tile.metric_a} metricB={tile.metric_b ?? undefined} height={chartH} />
        )}
      </div>
    </div>
  )
}

// ─── Dashboard Tiles Grid ─────────────────────────────────────────────────────

function DashboardGrid({
  workspaceId, connectionId, dashboardId, onGoToCanvas,
}: {
  workspaceId: string; connectionId?: string; dashboardId: string; onGoToCanvas: () => void
}) {
  const [tiles,      setTiles]      = useState<Tile[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTile, setActiveTile] = useState<Tile | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/dashboard/tiles?workspaceId=${workspaceId}`)
    const d   = await res.json()
    // Filter to this dashboard (or unassigned tiles for backward compat)
    const all: Tile[] = d.tiles ?? []
    setTiles(all.filter(t => t.dashboard_id === dashboardId))
    setLoading(false)
  }, [workspaceId, dashboardId])

  useEffect(() => { load() }, [load])

  function handleUpdate(id: string, patch: Partial<Tile>) {
    setTiles(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTile(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx  = tiles.findIndex(t => t.id === active.id)
    const newIdx  = tiles.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tiles, oldIdx, newIdx)
    setTiles(reordered)
    await fetch('/api/dashboard/tiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, positions: reordered.map((t, i) => ({ id: t.id, position: i })) }),
    })
  }

  if (loading) return (
    <div className="grid grid-cols-2 gap-4 animate-pulse">
      {[220, 200, 260, 200].map((h, i) => (
        <div key={i} className={cn('bg-white rounded-xl border border-border overflow-hidden', i === 0 ? 'col-span-2' : 'col-span-1')}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border/60">
            <div className="size-3 rounded bg-zinc-100 mr-1" />
            <div className="h-3.5 w-32 bg-zinc-100 rounded-full" />
            <div className="ml-auto h-3 w-20 bg-zinc-100 rounded-full" />
          </div>
          <div className="p-4">
            <div className="rounded-lg bg-zinc-50" style={{ height: h }} />
          </div>
        </div>
      ))}
    </div>
  )

  if (tiles.length === 0) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="size-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
        <LayoutDashboard className="size-6 text-zinc-400" />
      </div>
      <div>
        <p className="text-sm font-semibold">No charts yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Build a chart in the Canvas, then use "Add to Dashboard" to send it here.
        </p>
      </div>
      <Button size="sm" className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white" onClick={onGoToCanvas}>
        <ArrowRight className="size-3.5" /> Open Canvas
      </Button>
    </div>
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={e => setActiveTile(tiles.find(t => t.id === e.active.id) ?? null)}
      onDragEnd={handleDragEnd}>
      <SortableContext items={tiles.map(t => t.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4">
          {tiles.map(tile => (
            <TileCard key={tile.id} tile={tile} workspaceId={workspaceId}
              connectionId={connectionId}
              onDelete={id => setTiles(prev => prev.filter(t => t.id !== id))}
              onUpdate={handleUpdate} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeTile && (
          <div className={cn('bg-white border-2 border-zinc-900 rounded-xl shadow-xl opacity-90 p-4',
            activeTile.col_span === 2 ? 'col-span-2' : 'col-span-1')}>
            <p className="text-sm font-semibold">{activeTile.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{METRICS[activeTile.metric_a]?.label}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Main dashboards view ─────────────────────────────────────────────────────

interface Props {
  workspaceId?:  string
  connectionId?: string
  onNavigate?:   (view: string) => void
}

export function DashboardsView({ workspaceId, connectionId, onNavigate }: Props) {
  const [dashboards,   setDashboards]   = useState<Dashboard[]>([])
  const [selected,     setSelected]     = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [creating,     setCreating]     = useState(false)
  const [newName,      setNewName]      = useState('')
  const [showCreate,   setShowCreate]   = useState(false)
  const [renamingId,   setRenamingId]   = useState<string | null>(null)
  const [renameDraft,  setRenameDraft]  = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const loadDashboards = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    const res = await fetch(`/api/dashboards?workspaceId=${workspaceId}`)
    const d   = await res.json()
    const list: Dashboard[] = d.dashboards ?? []
    setDashboards(list)
    if (list.length > 0 && !selected) setSelected(list[0].id)
    setLoading(false)
  }, [workspaceId, selected])

  useEffect(() => { loadDashboards() }, [loadDashboards])
  useEffect(() => { if (renamingId) renameInputRef.current?.focus() }, [renamingId])

  async function createDashboard() {
    if (!workspaceId || !newName.trim()) return
    setCreating(true)
    const res  = await fetch('/api/dashboards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, name: newName.trim() }),
    })
    const data = await res.json()
    setCreating(false)
    setNewName('')
    setShowCreate(false)
    if (data.dashboard) {
      setDashboards(prev => [...prev, data.dashboard])
      setSelected(data.dashboard.id)
    }
  }

  async function renameDashboard(id: string) {
    const name = renameDraft.trim()
    setRenamingId(null)
    if (!name) return
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, name } : d))
    await fetch('/api/dashboards', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, id, name }),
    })
  }

  async function deleteDashboard(id: string) {
    setDashboards(prev => prev.filter(d => d.id !== id))
    if (selected === id) setSelected(dashboards.find(d => d.id !== id)?.id ?? null)
    await fetch(`/api/dashboards?id=${id}&workspaceId=${workspaceId}`, { method: 'DELETE' })
  }

  const activeDashboard = dashboards.find(d => d.id === selected)

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left sidebar: list of dashboards ── */}
      <div className="w-52 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Spaces</p>
          <button onClick={() => setShowCreate(v => !v)}
            className="p-1 rounded-lg text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100 transition-colors" title="New Space">
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* New Space input */}
        {showCreate && (
          <div className="mb-2 flex items-center gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createDashboard(); if (e.key === 'Escape') { setShowCreate(false); setNewName('') } }}
              placeholder="Dashboard name…"
              className="flex-1 h-7 text-xs rounded-lg border border-border px-2 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <button onClick={createDashboard} disabled={creating || !newName.trim()}
              className="h-7 px-2 text-xs rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors">
              {creating ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="size-3 animate-spin text-zinc-400" />
          </div>
        ) : dashboards.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No Spaces yet. Create one above.</p>
        ) : (
          <div className="space-y-0.5">
            {dashboards.map(db => (
              <div key={db.id}
                className={cn('group/db flex items-center gap-1 rounded-xl px-2 py-2 cursor-pointer transition-colors',
                  selected === db.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-700')}>
                {renamingId === db.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameDashboard(db.id); if (e.key === 'Escape') setRenamingId(null) }}
                    onBlur={() => renameDashboard(db.id)}
                    className="flex-1 min-w-0 text-xs bg-transparent border-b border-white outline-none"
                  />
                ) : (
                  <span className="flex-1 min-w-0 text-xs font-medium truncate" onClick={() => setSelected(db.id)}>
                    {db.name}
                  </span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/db:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setRenamingId(db.id); setRenameDraft(db.name) }}
                    className={cn('p-0.5 rounded', selected === db.id ? 'hover:text-white/70' : 'hover:text-zinc-900')}><Pencil className="size-2.5" /></button>
                  <button onClick={() => deleteDashboard(db.id)}
                    className={cn('p-0.5 rounded', selected === db.id ? 'hover:text-white/70' : 'hover:text-rose-500')}><Trash2 className="size-2.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px bg-border self-stretch" />

      {/* ── Right: dashboard content ── */}
      <div className="flex-1 min-w-0">
        {!selected || !workspaceId ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <LayoutDashboard className="size-8 text-zinc-300" />
            <p className="text-sm text-muted-foreground">Select or create a Space</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold">{activeDashboard?.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Build charts in Canvas and add them here · Drag to reorder · Hover to resize or rename
                </p>
              </div>
              <Button size="sm" className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white"
                onClick={() => onNavigate?.('canvas')}>
                <Plus className="size-3.5" /> Add from Canvas
              </Button>
            </div>
            <DashboardGrid
              workspaceId={workspaceId}
              connectionId={connectionId}
              dashboardId={selected}
              onGoToCanvas={() => onNavigate?.('canvas')}
            />
          </>
        )}
      </div>
    </div>
  )
}
