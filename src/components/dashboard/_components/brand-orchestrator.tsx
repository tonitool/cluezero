'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight, Check, GitMerge, Loader2, EyeOff, Eye,
  Trash2, Sparkles, Search, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RawName {
  name: string
  adCount: number
}

interface Alias {
  id: string
  raw_name: string
  canonical_name: string
  is_excluded: boolean
  updated_at?: string
}

interface Suggestion {
  names: string[]
  reason: string
}

interface Props {
  workspaceId: string
}

export function BrandOrchestrator({ workspaceId }: Props) {
  const [rawNames, setRawNames] = useState<RawName[]>([])
  const [aliases, setAliases] = useState<Alias[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(true)

  // Pending changes (not yet saved)
  const [pendingMerges, setPendingMerges] = useState<Record<string, string>>({})
  const [pendingExcludes, setPendingExcludes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/brand-aliases?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        setRawNames(d.rawNames ?? [])
        setAliases(d.aliases ?? [])
        setSuggestions(d.suggestions ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  const aliasMap = useMemo(() => {
    const m = new Map<string, Alias>()
    for (const a of aliases) m.set(a.raw_name, a)
    return m
  }, [aliases])

  const filtered = useMemo(() => {
    if (!search) return rawNames
    const q = search.toLowerCase()
    return rawNames.filter(r => r.name.toLowerCase().includes(q))
  }, [rawNames, search])

  // Categorize names
  const mapped = filtered.filter(r => aliasMap.has(r.name) && !aliasMap.get(r.name)!.is_excluded)
  const excluded = filtered.filter(r => aliasMap.get(r.name)?.is_excluded || pendingExcludes.has(r.name))
  const unmapped = filtered.filter(r => !aliasMap.has(r.name) && !pendingExcludes.has(r.name) && !pendingMerges[r.name])
  const pendingItems = filtered.filter(r => pendingMerges[r.name] && !pendingExcludes.has(r.name))

  function handleMerge(rawName: string, canonicalName: string) {
    setPendingMerges(prev => ({ ...prev, [rawName]: canonicalName }))
  }

  function handleExclude(rawName: string) {
    setPendingExcludes(prev => {
      const next = new Set(prev)
      if (next.has(rawName)) {
        next.delete(rawName)
      } else {
        next.add(rawName)
        const { [rawName]: _, ...rest } = pendingMerges
        setPendingMerges(rest)
      }
      return next
    })
  }

  function handleUndoPending(rawName: string) {
    const { [rawName]: _, ...rest } = pendingMerges
    setPendingMerges(rest)
    setPendingExcludes(prev => {
      const next = new Set(prev)
      next.delete(rawName)
      return next
    })
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
    } catch { /* ignore */ }
    setSaving(false)
  }

  async function handleRemoveAlias(alias: Alias) {
    await fetch(`/api/brand-aliases?workspaceId=${workspaceId}&id=${alias.id}`, { method: 'DELETE' })
    setAliases(prev => prev.filter(a => a.id !== alias.id))
  }

  const pendingCount = Object.keys(pendingMerges).length + pendingExcludes.size
  const totalBrands = rawNames.length
  const mappedCount = aliases.filter(a => !a.is_excluded).length
  const excludedCount = aliases.filter(a => a.is_excluded).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-zinc-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-zinc-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total raw names" value={totalBrands} />
        <StatCard label="Mapped" value={mappedCount} accent="emerald" />
        <StatCard label="Excluded" value={excludedCount} accent="rose" />
        <StatCard label="Unmapped" value={totalBrands - mappedCount - excludedCount} accent={totalBrands - mappedCount - excludedCount > 0 ? 'amber' : undefined} />
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <button
            onClick={() => setShowSuggestions(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Sparkles className="size-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">
              {suggestions.length} merge suggestion{suggestions.length !== 1 ? 's' : ''} detected
            </span>
            {showSuggestions ? <ChevronUp className="size-4 text-indigo-400 ml-auto" /> : <ChevronDown className="size-4 text-indigo-400 ml-auto" />}
          </button>
          {showSuggestions && (
            <div className="mt-3 space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-indigo-100 px-3 py-2.5">
                  <GitMerge className="size-4 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {s.names.map((n, j) => (
                        <span key={n}>
                          <Badge variant="secondary" className="text-[11px] font-mono">{n}</Badge>
                          {j < s.names.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.reason}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 shrink-0"
                    onClick={() => handleAcceptSuggestion(s)}>
                    <Check className="size-3" /> Merge
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save bar */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800 font-medium">
            {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { setPendingMerges({}); setPendingExcludes(new Set()) }}>
              Discard
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveAll} disabled={saving}>
              {saving && <Loader2 className="size-3 animate-spin" />}
              Save all
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search brand names…"
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Active aliases */}
      {mapped.length > 0 && (
        <Section title="Mapped brands" count={mapped.length}>
          {mapped.map(r => {
            const alias = aliasMap.get(r.name)!
            return (
              <AliasRow key={r.name}
                rawName={r.name}
                canonicalName={alias.canonical_name}
                adCount={r.adCount}
                isMapped
                onRemove={() => handleRemoveAlias(alias)}
              />
            )
          })}
        </Section>
      )}

      {/* Pending changes */}
      {pendingItems.length > 0 && (
        <Section title="Pending merges" count={pendingItems.length} accent="amber">
          {pendingItems.map(r => (
            <AliasRow key={r.name}
              rawName={r.name}
              canonicalName={pendingMerges[r.name]}
              adCount={r.adCount}
              isPending
              onRemove={() => handleUndoPending(r.name)}
            />
          ))}
        </Section>
      )}

      {/* Unmapped */}
      {unmapped.length > 0 && (
        <Section title="Unmapped brands" count={unmapped.length} accent="slate">
          {unmapped.map(r => (
            <UnmappedRow key={r.name}
              rawName={r.name}
              adCount={r.adCount}
              allNames={rawNames.map(x => x.name)}
              onMerge={(canonical) => handleMerge(r.name, canonical)}
              onExclude={() => handleExclude(r.name)}
            />
          ))}
        </Section>
      )}

      {/* Excluded */}
      {excluded.length > 0 && (
        <Section title="Excluded" count={excluded.length} accent="rose">
          {excluded.map(r => {
            const alias = aliasMap.get(r.name)
            const isPending = pendingExcludes.has(r.name)
            return (
              <div key={r.name}
                className="flex items-center gap-3 px-3 py-2 bg-rose-50/50 rounded-lg border border-rose-100"
              >
                <EyeOff className="size-3.5 text-rose-400 shrink-0" />
                <span className="text-xs font-mono text-rose-700 line-through">{r.name}</span>
                <span className="text-[10px] text-rose-400 tabular-nums">{r.adCount} ads</span>
                <button
                  className="ml-auto text-[10px] text-rose-500 hover:text-rose-700 underline"
                  onClick={() => isPending ? handleUndoPending(r.name) : alias && handleRemoveAlias(alias)}
                >
                  Restore
                </button>
              </div>
            )
          })}
        </Section>
      )}

      {rawNames.length === 0 && (
        <div className="text-center py-12 text-xs text-muted-foreground">
          No brand data yet. Connect a data source and sync to see brands here.
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const colors = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    rose: 'text-rose-700 bg-rose-50 border-rose-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
  }
  const c = accent ? colors[accent as keyof typeof colors] : 'text-foreground bg-white border-border'
  return (
    <div className={cn('rounded-lg border px-4 py-3', c)}>
      <p className="text-[10px] font-medium uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  )
}

function Section({ title, count, accent, children }: { title: string; count: number; accent?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 mb-2 w-full text-left">
        {open ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
        <span className="text-xs font-semibold">{title}</span>
        <Badge variant={accent === 'amber' ? 'outline' : 'secondary'} className="text-[10px] h-5">{count}</Badge>
      </button>
      {open && <div className="space-y-1.5 ml-5">{children}</div>}
    </div>
  )
}

function AliasRow({ rawName, canonicalName, adCount, isMapped, isPending, onRemove }: {
  rawName: string; canonicalName: string; adCount: number
  isMapped?: boolean; isPending?: boolean; onRemove: () => void
}) {
  const same = rawName === canonicalName
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
      isPending ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-50 border-zinc-100',
    )}>
      <span className="font-mono text-muted-foreground">{rawName}</span>
      {!same && (
        <>
          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
          <span className="font-mono font-semibold">{canonicalName}</span>
        </>
      )}
      <span className="text-[10px] text-muted-foreground tabular-nums ml-1">{adCount} ads</span>
      {isMapped && <Check className="size-3 text-emerald-500 ml-auto shrink-0" />}
      <button onClick={onRemove} className="ml-auto p-1 text-muted-foreground hover:text-rose-500 transition-colors">
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}

function UnmappedRow({ rawName, adCount, allNames, onMerge, onExclude }: {
  rawName: string; adCount: number; allNames: string[]
  onMerge: (canonical: string) => void; onExclude: () => void
}) {
  const [showMerge, setShowMerge] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')

  const suggestions = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.,()&+]/g, '')
    const n = norm(rawName)
    return allNames
      .filter(name => name !== rawName && norm(name) !== n)
      .filter(name => {
        const nn = norm(name)
        return nn.includes(n) || n.includes(nn)
      })
      .slice(0, 5)
  }, [rawName, allNames])

  return (
    <div className="px-3 py-2 rounded-lg border border-zinc-100 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono">{rawName}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{adCount} ads</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2"
            onClick={() => setShowMerge(v => !v)}>
            <GitMerge className="size-3" /> Merge
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2 text-rose-500 hover:text-rose-700"
            onClick={onExclude}>
            <EyeOff className="size-3" /> Exclude
          </Button>
        </div>
      </div>
      {showMerge && (
        <div className="mt-2 ml-4 flex items-center gap-2 flex-wrap">
          <ArrowRight className="size-3 text-muted-foreground" />
          <Input
            value={mergeTarget}
            onChange={e => setMergeTarget(e.target.value)}
            placeholder="Canonical brand name"
            className="h-7 text-[11px] w-48 font-mono"
          />
          <Button size="sm" className="h-7 text-[10px]" disabled={!mergeTarget.trim()}
            onClick={() => { onMerge(mergeTarget.trim()); setShowMerge(false); setMergeTarget('') }}>
            Apply
          </Button>
          {suggestions.length > 0 && (
            <div className="flex gap-1 items-center">
              <span className="text-[10px] text-muted-foreground">or merge into:</span>
              {suggestions.map(s => (
                <button key={s}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  onClick={() => { onMerge(s); setShowMerge(false) }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
