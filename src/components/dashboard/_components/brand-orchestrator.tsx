'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ArrowRight, Check, Loader2, EyeOff, Eye,
  Sparkles, Search, AlertTriangle, Pencil, X, Merge, Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface RawName {
  name: string
  adCount: number
}

interface Alias {
  id: string
  raw_name: string
  canonical_name: string
  is_excluded: boolean
}

interface Suggestion {
  names: string[]
  reason: string
}

type RowStatus = 'mapped' | 'excluded' | 'pending-merge' | 'pending-exclude' | 'unmapped'

interface DisplayRow {
  rawName: string
  displayName: string
  adCount: number
  status: RowStatus
  aliasId?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RowStatus, { label: string; dot: string; bg: string }> = {
  'mapped':          { label: 'Mapped',    dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
  'excluded':        { label: 'Hidden',    dot: 'bg-rose-400',    bg: 'bg-rose-50' },
  'pending-merge':   { label: 'Pending',   dot: 'bg-amber-500',   bg: 'bg-amber-50' },
  'pending-exclude': { label: 'Pending',   dot: 'bg-amber-500',   bg: 'bg-amber-50' },
  'unmapped':        { label: 'No change', dot: 'bg-zinc-300',    bg: 'bg-white' },
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  workspaceId: string
}

export function BrandOrchestrator({ workspaceId }: Props) {
  const [rawNames, setRawNames] = useState<RawName[]>([])
  const [aliases, setAliases] = useState<Alias[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Pending changes
  const [pendingMerges, setPendingMerges] = useState<Record<string, string>>({})
  const [pendingExcludes, setPendingExcludes] = useState<Set<string>>(new Set())

  // Selection for bulk operations
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Inline editing
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    fetch(`/api/brand-aliases?workspaceId=${workspaceId}`)
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => {
        setRawNames(d.rawNames ?? [])
        setAliases(d.aliases ?? [])
        setSuggestions(d.suggestions ?? [])
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [workspaceId])

  // Build alias lookup
  const aliasMap = useMemo(() => {
    const m = new Map<string, Alias>()
    for (const a of aliases) m.set(a.raw_name, a)
    return m
  }, [aliases])

  // Build display rows (single flat list)
  const displayRows: DisplayRow[] = useMemo(() => {
    return rawNames.map(r => {
      const alias = aliasMap.get(r.name)
      const isPendingMerge = !!pendingMerges[r.name]
      const isPendingExclude = pendingExcludes.has(r.name)

      let status: RowStatus = 'unmapped'
      let displayName = r.name

      if (isPendingExclude) {
        status = 'pending-exclude'
      } else if (isPendingMerge) {
        status = 'pending-merge'
        displayName = pendingMerges[r.name]
      } else if (alias?.is_excluded) {
        status = 'excluded'
      } else if (alias) {
        status = 'mapped'
        displayName = alias.canonical_name
      }

      return {
        rawName: r.name,
        displayName,
        adCount: r.adCount,
        status,
        aliasId: alias?.id,
      }
    })
  }, [rawNames, aliasMap, pendingMerges, pendingExcludes])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return displayRows
    const q = search.toLowerCase()
    return displayRows.filter(r =>
      r.rawName.toLowerCase().includes(q) ||
      r.displayName.toLowerCase().includes(q)
    )
  }, [displayRows, search])

  // Sort: pending first, then mapped, then unmapped, then excluded
  const sorted = useMemo(() => {
    const order: Record<RowStatus, number> = {
      'pending-merge': 0, 'pending-exclude': 0,
      'unmapped': 1, 'mapped': 2, 'excluded': 3,
    }
    return [...filtered].sort((a, b) => {
      const diff = order[a.status] - order[b.status]
      if (diff !== 0) return diff
      return b.adCount - a.adCount
    })
  }, [filtered])

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleRename(rawName: string, newDisplayName: string) {
    if (!newDisplayName.trim() || newDisplayName.trim() === rawName) {
      // If renamed back to original, remove the pending merge
      const { [rawName]: _, ...rest } = pendingMerges
      setPendingMerges(rest)
      return
    }
    setPendingMerges(prev => ({ ...prev, [rawName]: newDisplayName.trim() }))
    setPendingExcludes(prev => {
      const next = new Set(prev)
      next.delete(rawName)
      return next
    })
  }

  function handleExclude(rawName: string) {
    setPendingExcludes(prev => {
      const next = new Set(prev)
      next.add(rawName)
      return next
    })
    const { [rawName]: _, ...rest } = pendingMerges
    setPendingMerges(rest)
    setSelected(prev => { const next = new Set(prev); next.delete(rawName); return next })
  }

  function handleRestore(rawName: string) {
    setPendingExcludes(prev => {
      const next = new Set(prev)
      next.delete(rawName)
      return next
    })
    const { [rawName]: _, ...rest } = pendingMerges
    setPendingMerges(rest)
  }

  function handleBulkMerge() {
    if (selected.size < 2) return
    // Pick the name with most ads as canonical
    const candidates = [...selected].map(name => ({
      name,
      adCount: rawNames.find(r => r.name === name)?.adCount ?? 0,
    }))
    candidates.sort((a, b) => b.adCount - a.adCount)
    const canonical = candidates[0].name

    for (const { name } of candidates) {
      if (name !== canonical) {
        setPendingMerges(prev => ({ ...prev, [name]: canonical }))
      }
    }
    setSelected(new Set())
  }

  function handleBulkExclude() {
    for (const name of selected) {
      handleExclude(name)
    }
    setSelected(new Set())
  }

  function handleAcceptSuggestion(suggestion: Suggestion) {
    const canonical = suggestion.names.reduce((a, b) => {
      const aCount = rawNames.find(r => r.name === a)?.adCount ?? 0
      const bCount = rawNames.find(r => r.name === b)?.adCount ?? 0
      return bCount > aCount ? b : a
    })
    for (const name of suggestion.names) {
      if (name !== canonical) {
        setPendingMerges(prev => ({ ...prev, [name]: canonical }))
      }
    }
    setSuggestions(prev => prev.filter(s => s !== suggestion))
  }

  async function handleSaveAll() {
    const toSave: { rawName: string; canonicalName: string; isExcluded: boolean }[] = []

    for (const [rawName, canonicalName] of Object.entries(pendingMerges)) {
      toSave.push({ rawName, canonicalName, isExcluded: false })
    }
    for (const rawName of pendingExcludes) {
      toSave.push({ rawName, canonicalName: rawName, isExcluded: true })
    }

    if (toSave.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/brand-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, aliases: toSave }),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      const data = await res.json()
      if (data.aliases) {
        setAliases(prev => {
          const map = new Map(prev.map(a => [a.raw_name, a]))
          for (const a of data.aliases) map.set(a.raw_name, a)
          return Array.from(map.values())
        })
      }
      setPendingMerges({})
      setPendingExcludes(new Set())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  async function handleRemoveAlias(alias: Alias) {
    await fetch(`/api/brand-aliases?workspaceId=${workspaceId}&id=${alias.id}`, { method: 'DELETE' })
    setAliases(prev => prev.filter(a => a.id !== alias.id))
  }

  function handleDiscardAll() {
    setPendingMerges({})
    setPendingExcludes(new Set())
  }

  function toggleSelect(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map(r => r.rawName)))
    }
  }

  // ── Derived counts ─────────────────────────────────────────────────────────

  const pendingCount = Object.keys(pendingMerges).length + pendingExcludes.size
  const stats = useMemo(() => {
    let mapped = 0, excluded = 0, unmapped = 0
    for (const r of displayRows) {
      if (r.status === 'mapped' || r.status === 'pending-merge') mapped++
      else if (r.status === 'excluded' || r.status === 'pending-exclude') excluded++
      else unmapped++
    }
    return { total: displayRows.length, mapped, excluded, unmapped }
  }, [displayRows])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
        <div className="h-80 bg-zinc-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (rawNames.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No brand data yet. Connect a data source and sync to see brands here.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Stats strip */}
      <div className="flex items-center gap-6 text-xs">
        <span className="font-medium">{stats.total} source names</span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          {stats.mapped} renamed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-400" />
          {stats.excluded} hidden
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-zinc-300" />
          {stats.unmapped} pass-through
        </span>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-3.5 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-900">
              Suggested merges — these look like the same brand
            </span>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                  {s.names.map((n, j) => (
                    <span key={n} className="flex items-center gap-1">
                      <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-indigo-100">{n}</span>
                      {j < s.names.length - 1 && <ArrowRight className="size-3 text-indigo-300" />}
                    </span>
                  ))}
                  <span className="text-[10px] text-indigo-500 ml-1">{s.reason}</span>
                </div>
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  onClick={() => handleAcceptSuggestion(s)}>
                  <Check className="size-3" /> Accept
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar: search + bulk actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter brand names…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        {selected.size >= 2 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
              onClick={handleBulkMerge}>
              <Merge className="size-3" /> Merge into one
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-rose-600 hover:text-rose-700"
              onClick={handleBulkExclude}>
              <EyeOff className="size-3" /> Hide selected
            </Button>
          </div>
        )}
      </div>

      {/* Pending changes bar */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800 font-medium">
            {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''} — changes apply to all dashboards
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleDiscardAll}>
              Discard
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveAll} disabled={saving}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[32px_1fr_24px_1fr_72px_80px_72px] gap-0 items-center px-3 py-2 bg-zinc-50 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={selected.size === sorted.length && sorted.length > 0}
              onChange={toggleSelectAll}
              className="size-3.5 rounded border-zinc-300 accent-indigo-600"
            />
          </div>
          <div>Source name</div>
          <div />
          <div>Display name</div>
          <div className="text-right">Ads</div>
          <div className="text-center">Status</div>
          <div className="text-center">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {sorted.map(row => (
            <MappingRow
              key={row.rawName}
              row={row}
              isSelected={selected.has(row.rawName)}
              isEditing={editingRow === row.rawName}
              editValue={editValue}
              onToggleSelect={() => toggleSelect(row.rawName)}
              onStartEdit={() => { setEditingRow(row.rawName); setEditValue(row.displayName) }}
              onEditChange={setEditValue}
              onConfirmEdit={() => { handleRename(row.rawName, editValue); setEditingRow(null) }}
              onCancelEdit={() => setEditingRow(null)}
              onExclude={() => handleExclude(row.rawName)}
              onRestore={() => handleRestore(row.rawName)}
              onRemoveAlias={() => {
                const alias = aliasMap.get(row.rawName)
                if (alias) handleRemoveAlias(alias)
              }}
            />
          ))}
        </div>
      </div>

      {sorted.length === 0 && search && (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No brands match &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Help text */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        <strong>How it works:</strong> Click a display name to rename it. Select multiple rows and click &ldquo;Merge&rdquo; to combine them under one name.
        Hidden brands are excluded from all dashboards and reports. Changes take effect after saving.
      </p>
    </div>
  )
}

// ── Mapping row ──────────────────────────────────────────────────────────────

interface MappingRowProps {
  row: DisplayRow
  isSelected: boolean
  isEditing: boolean
  editValue: string
  onToggleSelect: () => void
  onStartEdit: () => void
  onEditChange: (v: string) => void
  onConfirmEdit: () => void
  onCancelEdit: () => void
  onExclude: () => void
  onRestore: () => void
  onRemoveAlias: () => void
}

function MappingRow({
  row, isSelected, isEditing, editValue,
  onToggleSelect, onStartEdit, onEditChange, onConfirmEdit, onCancelEdit,
  onExclude, onRestore, onRemoveAlias,
}: MappingRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isExcluded = row.status === 'excluded' || row.status === 'pending-exclude'
  const isPending = row.status === 'pending-merge' || row.status === 'pending-exclude'
  const isMapped = row.status === 'mapped'
  const isRenamed = row.rawName !== row.displayName
  const cfg = STATUS_CONFIG[row.status]

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onConfirmEdit()
    if (e.key === 'Escape') onCancelEdit()
  }

  return (
    <div className={cn(
      'grid grid-cols-[32px_1fr_24px_1fr_72px_80px_72px] gap-0 items-center px-3 py-2 text-xs transition-colors',
      isExcluded && 'bg-rose-50/40 opacity-60',
      isPending && !isExcluded && 'bg-amber-50/40',
      isSelected && 'bg-indigo-50/40',
    )}>
      {/* Checkbox */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="size-3.5 rounded border-zinc-300 accent-indigo-600"
        />
      </div>

      {/* Source name */}
      <div className={cn('font-mono text-[11px] truncate', isExcluded && 'line-through text-muted-foreground')}>
        {row.rawName}
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        {isRenamed && <ArrowRight className="size-3 text-muted-foreground" />}
      </div>

      {/* Display name (editable) */}
      <div className="min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-6 text-[11px] font-mono px-1.5 flex-1"
            />
            <button onClick={onConfirmEdit} className="p-0.5 text-emerald-600 hover:text-emerald-700">
              <Check className="size-3.5" />
            </button>
            <button onClick={onCancelEdit} className="p-0.5 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onStartEdit}
            className={cn(
              'group flex items-center gap-1.5 max-w-full text-left',
              isExcluded && 'pointer-events-none',
            )}
          >
            <span className={cn(
              'font-mono text-[11px] truncate',
              isRenamed && 'font-semibold',
              isExcluded && 'line-through text-muted-foreground',
            )}>
              {row.displayName}
            </span>
            {!isExcluded && (
              <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </button>
        )}
      </div>

      {/* Ad count */}
      <div className="text-right tabular-nums text-muted-foreground">
        {row.adCount.toLocaleString()}
      </div>

      {/* Status */}
      <div className="flex justify-center">
        <span className={cn('flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded-full', cfg.bg)}>
          <span className={cn('size-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-0.5">
        {isExcluded ? (
          <button
            onClick={isPending ? onRestore : onRemoveAlias}
            className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
            title="Restore"
          >
            <Eye className="size-3.5" />
          </button>
        ) : isPending ? (
          <button
            onClick={onRestore}
            className="p-1 text-amber-600 hover:text-amber-800 transition-colors"
            title="Undo"
          >
            <Undo2 className="size-3.5" />
          </button>
        ) : isMapped ? (
          <>
            <button
              onClick={onStartEdit}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Edit display name"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={onRemoveAlias}
              className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"
              title="Reset to original"
            >
              <Undo2 className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartEdit}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Rename"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={onExclude}
              className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"
              title="Hide from reports"
            >
              <EyeOff className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
