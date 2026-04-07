'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Loader2, AlertCircle, Sparkles, X, Trash2, Database, Shuffle } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { setBrandColors as cacheBrandColors, RANDOM_PALETTE } from '@/lib/brand-colors'

const PLATFORM_COLORS: Record<string, string> = {
  Meta:     '#1877F2',
  Google:   '#34A853',
  LinkedIn: '#0A66C2',
}

// ── Color picker swatches ─────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#E4002B','#DC2626','#EF4444','#F97316','#E11D48',
  '#EC6B1E','#F59E0B','#FBCE07','#D97706','#EAB308',
  '#10B981','#22C55E','#059669','#16A34A','#15803D',
  '#0066B2','#3B82F6','#0EA5E9','#003087','#1877F2',
  '#6366F1','#8B5CF6','#5C5C5C','#71717A','#18181B',
]

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  const [hex,  setHex]  = useState(color)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setHex(color) }, [color])
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function apply(c: string) { onChange(c); setHex(c); setOpen(false) }

  function handleHexInput(val: string) {
    setHex(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onChange(val)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="size-5 rounded-full border-2 border-white shadow ring-1 ring-zinc-200 hover:ring-zinc-400 transition-all shrink-0"
        style={{ background: color }}
        title="Change color"
      />
      {open && (
        <div className="absolute left-0 top-7 z-50 bg-white border border-zinc-200 rounded-2xl shadow-xl p-3 w-[172px]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Pick a color</p>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {COLOR_SWATCHES.map(c => (
              <button key={c} onClick={() => apply(c)}
                className={cn('size-6 rounded-full border-2 transition-transform hover:scale-110',
                  color === c ? 'border-zinc-900 scale-110' : 'border-white shadow ring-1 ring-zinc-100')}
                style={{ background: c }} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-5 rounded-full shrink-0 border border-zinc-200" style={{ background: hex }} />
            <input
              value={hex}
              onChange={e => handleHexInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') apply(hex) }}
              placeholder="#000000"
              className="flex-1 h-7 text-[11px] rounded-lg border border-zinc-200 px-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

interface Props {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  ownBrand?: string
}

export function SetupView({ workspaceId, workspaceName, workspaceSlug, ownBrand: initialOwnBrand = '' }: Props) {
  const router = useRouter()
  // ── Brand colors ─────────────────────────────────────────────────────────────
  interface BrandEntry { name: string; platforms: string[]; isOwn: boolean; color: string | null; source: 'sync' | 'manual' }
  const [brands,        setBrands]           = useState<BrandEntry[]>([])
  const [brandColors,   setBrandColorsState] = useState<Record<string, string>>({})
  const [brandsLoading, setBrandsLoading]    = useState(true)
  const [colorsSaving,  setColorsSaving]     = useState(false)
  // Add brand form
  const [showAddForm,   setShowAddForm]   = useState(false)
  const [newBrandName,  setNewBrandName]  = useState('')
  const [newBrandColor, setNewBrandColor] = useState(COLOR_SWATCHES[0])
  const [addingBrand,   setAddingBrand]   = useState(false)
  const [addError,      setAddError]      = useState<string | null>(null)
  // Delete
  const [deletingBrand,  setDeletingBrand]  = useState<string | null>(null)
  const [randomizing,    setRandomizing]    = useState(false)
  // Rename
  const [renamingBrand,  setRenamingBrand]  = useState<string | null>(null)
  const [renameValue,    setRenameValue]    = useState('')
  const [renameSaving,   setRenameSaving]   = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)
  const [refreshCadence, setRefreshCadence] = useState('daily')
  const [aiEnrichment, setAiEnrichment] = useState(true)
  const [spendModel, setSpendModel] = useState('cpm')
  const [saved, setSaved] = useState(false)

  // Workspace details
  const [wsName, setWsName] = useState(workspaceName)
  const [wsSlug, setWsSlug] = useState(workspaceSlug)
  const [wsOwnBrand, setWsOwnBrand] = useState(initialOwnBrand)
  const [savingWs, setSavingWs] = useState(false)
  const [wsFeedback, setWsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // AI profile
  const [companyName,       setCompanyName]       = useState('')
  const [industry,          setIndustry]           = useState('')
  const [website,           setWebsite]            = useState('')
  const [brandDescription,  setBrandDescription]   = useState('')
  const [targetAudience,    setTargetAudience]      = useState('')
  const [aiContext,         setAiContext]           = useState('')
  const [profileLoaded,     setProfileLoaded]       = useState(false)
  const [savingProfile,     setSavingProfile]       = useState(false)
  const [profileFeedback,   setProfileFeedback]     = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load brands from DB
  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/brands?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        setBrands(d.brands ?? [])
        const colors = d.savedColors ?? {}
        setBrandColorsState(colors)
        cacheBrandColors(workspaceId, colors)
      })
      .catch(() => {})
      .finally(() => setBrandsLoading(false))
  }, [workspaceId])

  async function saveBrandColor(brandName: string, color: string) {
    const next = { ...brandColors, [brandName]: color }
    setBrandColorsState(next)
    cacheBrandColors(workspaceId, next)
    setColorsSaving(true)
    await fetch('/api/workspace/colors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, brandColors: next }),
    }).finally(() => setColorsSaving(false))
  }

  // Focus the name input when the add form opens
  useEffect(() => {
    if (showAddForm) setTimeout(() => addInputRef.current?.focus(), 50)
  }, [showAddForm])

  async function handleAddBrand() {
    const name = newBrandName.trim()
    if (!name) return
    setAddingBrand(true)
    setAddError(null)
    const res  = await fetch('/api/brands', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ workspaceId, name, color: newBrandColor }),
    })
    const data = await res.json()
    setAddingBrand(false)
    if (!res.ok) {
      setAddError(data.error ?? 'Could not add brand.')
      return
    }
    // Add to local list and update color cache
    setBrands(prev => [...prev, data.brand].sort((a, b) => a.name.localeCompare(b.name)))
    const next = { ...brandColors, [name]: newBrandColor }
    setBrandColorsState(next)
    cacheBrandColors(workspaceId, next)
    // Reset form
    setNewBrandName('')
    setNewBrandColor(COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)])
    setShowAddForm(false)
  }

  async function handleDeleteBrand(name: string) {
    setDeletingBrand(name)
    await fetch(`/api/brands?workspaceId=${encodeURIComponent(workspaceId)}&name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    setBrands(prev => prev.filter(b => b.name !== name))
    const next = { ...brandColors }
    delete next[name]
    setBrandColorsState(next)
    cacheBrandColors(workspaceId, next)
    setDeletingBrand(null)
  }

  async function handleRenameBrand(oldName: string, newName: string) {
    newName = newName.trim()
    if (!newName || newName === oldName) { setRenamingBrand(null); return }
    setRenameSaving(true)
    await fetch('/api/brands', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, oldName, newName }),
    })
    // Update local state
    setBrands(prev => prev.map(b => b.name === oldName ? { ...b, name: newName } : b))
    const next = { ...brandColors }
    if (next[oldName] !== undefined) {
      next[newName] = next[oldName]
      delete next[oldName]
    }
    setBrandColorsState(next)
    cacheBrandColors(workspaceId, next)
    setRenamingBrand(null)
    setRenameSaving(false)
  }

  async function handleRandomize() {
    if (brands.length === 0 || randomizing) return
    setRandomizing(true)
    // Fisher-Yates shuffle then assign one color per brand
    const pool = [...RANDOM_PALETTE].sort(() => Math.random() - 0.5)
    const next: Record<string, string> = { ...brandColors }
    brands.forEach((brand, i) => {
      next[brand.name] = pool[i % pool.length]
    })
    setBrandColorsState(next)
    cacheBrandColors(workspaceId, next)
    await fetch('/api/workspace/colors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, brandColors: next }),
    }).finally(() => setRandomizing(false))
  }

  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/workspace/profile?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ownBrand          !== undefined) setWsOwnBrand(d.ownBrand)
        if (d.companyName       !== undefined) setCompanyName(d.companyName)
        if (d.industry          !== undefined) setIndustry(d.industry)
        if (d.website           !== undefined) setWebsite(d.website)
        if (d.brandDescription  !== undefined) setBrandDescription(d.brandDescription)
        if (d.targetAudience    !== undefined) setTargetAudience(d.targetAudience)
        if (d.aiContext         !== undefined) setAiContext(d.aiContext)
        setProfileLoaded(true)
      })
      .catch(() => setProfileLoaded(true))
  }, [workspaceId])

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileFeedback(null)
    const res = await fetch('/api/workspace/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        name: wsName,
        slug: wsSlug,
        ownBrand: wsOwnBrand,
        companyName,
        industry,
        website,
        brandDescription,
        targetAudience,
        aiContext,
      }),
    })
    const data = await res.json()
    setSavingProfile(false)
    if (!res.ok) {
      setProfileFeedback({ type: 'error', message: data.error ?? 'Failed to save.' })
    } else {
      setProfileFeedback({ type: 'success', message: 'AI profile saved. Claude will use this context in all future responses.' })
    }
  }

  const derivedSlug = wsName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  function handleNameChange(value: string) {
    setWsName(value)
    setWsSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  async function handleSaveWorkspace() {
    setSavingWs(true)
    setWsFeedback(null)
    const res = await fetch('/api/workspace/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, name: wsName, slug: wsSlug }),
    })
    const data = await res.json()
    setSavingWs(false)
    if (!res.ok) {
      setWsFeedback({ type: 'error', message: data.error ?? 'Failed to save.' })
    } else {
      setWsFeedback({ type: 'success', message: 'Workspace updated.' })
      if (data.slug !== workspaceSlug) {
        router.push(`/dashboard/${data.slug}`)
        router.refresh()
      }
    }
  }

  const wsChanged = wsName !== workspaceName || wsSlug !== workspaceSlug

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <SectionHeader
        title="Workspace Setup"
        description="Configure tracked brands, data sources, refresh cadence, and enrichment settings"
      >
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave}>
          {saved ? <><Check className="size-3.5" /> Saved</> : 'Save Changes'}
        </Button>
      </SectionHeader>

      {/* Workspace details — name + slug only */}
      <div className="bg-white rounded-lg border border-border shadow-sm p-5 mb-4 max-w-lg">
        <p className="text-sm font-semibold mb-0.5">Workspace</p>
        <p className="text-xs text-muted-foreground mb-4">Internal workspace name and URL.</p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-name" className="text-xs">Workspace name</Label>
            <Input
              id="ws-name"
              value={wsName}
              onChange={e => handleNameChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-slug" className="text-xs">URL slug</Label>
            <Input
              id="ws-slug"
              value={wsSlug}
              onChange={e => setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="h-8 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              app.cluezero.io/dashboard/<strong>{wsSlug || derivedSlug}</strong>
            </p>
          </div>

          {wsFeedback && (
            <div className={cn(
              'flex items-center gap-2 text-xs px-3 py-2 rounded-md border',
              wsFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            )}>
              {wsFeedback.type === 'success'
                ? <Check className="size-3.5 shrink-0" />
                : <AlertCircle className="size-3.5 shrink-0" />}
              {wsFeedback.message}
            </div>
          )}

          <div>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={savingWs || !wsChanged || !wsName.trim() || !wsSlug.trim()}
              onClick={handleSaveWorkspace}
            >
              {savingWs && <Loader2 className="size-3 mr-1.5 animate-spin" />}
              Save workspace
            </Button>
          </div>
        </div>
      </div>

      {/* ── Brand & AI Profile ── */}
      <div className="bg-white rounded-lg border border-border shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-zinc-400" />
          <p className="text-sm font-semibold">Brand &amp; AI Profile</p>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Define your brand once. Used across charts, the Brand Deep Dive view, and injected into every AI conversation so Claude always knows who it&apos;s working for.
        </p>

        {!profileLoaded ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-8 bg-zinc-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ws-own-brand" className="text-xs">Brand name <span className="text-muted-foreground font-normal">(as it appears in ad data)</span></Label>
              <Input
                id="ws-own-brand"
                value={wsOwnBrand}
                onChange={e => setWsOwnBrand(e.target.value)}
                placeholder="e.g. Apple, Nike, Volkswagen"
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Used in charts and the Brand Deep Dive view.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name" className="text-xs">Company name <span className="text-muted-foreground font-normal">(formal / legal)</span></Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp, Apple Inc."
                className="h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="industry" className="text-xs">Industry / sector</Label>
              <Input
                id="industry"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="e.g. Fuel & Mobility Retail"
                className="h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="website" className="text-xs">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="e.g. https://yourcompany.com"
                className="h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target-audience" className="text-xs">Target audience</Label>
              <Input
                id="target-audience"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="e.g. 25–45 year-old drivers, SME decision-makers, families"
                className="h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="brand-description" className="text-xs">Brand description <span className="text-muted-foreground font-normal">(positioning, differentiators)</span></Label>
              <Textarea
                id="brand-description"
                value={brandDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBrandDescription(e.target.value)}
                placeholder="e.g. A leading consumer brand known for quality and innovation. Competing on loyalty, convenience, and sustainability."
                className="text-sm resize-none min-h-[72px]"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="ai-context" className="text-xs">Additional AI context <span className="text-muted-foreground font-normal">(objectives, constraints, anything Claude should know)</span></Label>
              <Textarea
                id="ai-context"
                value={aiContext}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiContext(e.target.value)}
                placeholder="e.g. Our main paid media objective this quarter is loyalty sign-ups. We're under-indexed on Google vs competitors. Shell is our primary threat on premium positioning."
                className="text-sm resize-none min-h-[72px]"
                rows={3}
              />
            </div>

          </div>
        )}

        {profileFeedback && (
          <div className={cn(
            'flex items-center gap-2 text-xs px-3 py-2 rounded-md border mt-4',
            profileFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-600 border-rose-200'
          )}>
            {profileFeedback.type === 'success'
              ? <Check className="size-3.5 shrink-0" />
              : <AlertCircle className="size-3.5 shrink-0" />}
            {profileFeedback.message}
          </div>
        )}

        <div className="mt-4">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={savingProfile || !profileLoaded}
            onClick={handleSaveProfile}
          >
            {savingProfile
              ? <><Loader2 className="size-3 animate-spin" /> Saving…</>
              : <><Sparkles className="size-3" /> Save brand profile</>
            }
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Tracked brands - takes 2 cols */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-lg border border-border shadow-sm p-5">

            {/* ── Section header ── */}
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <p className="text-sm font-semibold">Tracked Brands</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Competitors and your own brand. Auto-imported from syncs — or add manually and match later.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Randomize colors */}
                <button
                  onClick={handleRandomize}
                  disabled={randomizing || brands.length === 0}
                  title="Randomize all brand colors"
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-40 transition-colors"
                >
                  {randomizing
                    ? <Loader2 className="size-3 animate-spin" />
                    : <Shuffle className="size-3" />
                  }
                  Randomize
                </button>

                {/* Add brand */}
                <button
                  onClick={() => { setShowAddForm(v => !v); setAddError(null) }}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition-colors',
                    showAddForm
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  )}
                >
                  {showAddForm ? <X className="size-3" /> : <Plus className="size-3" />}
                  {showAddForm ? 'Cancel' : 'Add brand'}
                </button>
              </div>
            </div>

            {/* ── Add brand inline form ── */}
            {showAddForm && (
              <div className="mb-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50/60">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2.5">New brand</p>
                <div className="flex items-center gap-2.5">
                  <ColorPicker color={newBrandColor} onChange={setNewBrandColor} />
                  <input
                    ref={addInputRef}
                    value={newBrandName}
                    onChange={e => { setNewBrandName(e.target.value); setAddError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddBrand(); if (e.key === 'Escape') setShowAddForm(false) }}
                    placeholder="Brand name (e.g. Shell, Nike, Volkswagen)"
                    className="flex-1 h-8 text-sm rounded-lg border border-zinc-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                  <button
                    onClick={handleAddBrand}
                    disabled={addingBrand || !newBrandName.trim()}
                    className="h-8 px-3.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    {addingBrand ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Add
                  </button>
                </div>
                {addError && (
                  <p className="mt-2 text-[11px] text-rose-500 flex items-center gap-1.5">
                    <AlertCircle className="size-3 shrink-0" /> {addError}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-zinc-400">
                  If this brand name matches data in a future sync, it will be linked automatically.
                </p>
              </div>
            )}

            {/* ── Saving indicator ── */}
            {colorsSaving && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-2">
                <Loader2 className="size-3 animate-spin" /> Saving color…
              </div>
            )}

            {/* ── Brand list ── */}
            <div className="space-y-1.5">
              {brandsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-11 rounded-xl bg-zinc-100 animate-pulse" />
                ))
              ) : brands.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-center">
                  <div className="size-10 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center">
                    <Database className="size-4 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">No brands yet</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Add one manually above, or connect a data source and run a sync.
                    </p>
                  </div>
                </div>
              ) : (
                brands.map(brand => {
                  const currentColor = brandColors[brand.name] ?? brand.color ?? '#94a3b8'
                  const isDeleting   = deletingBrand === brand.name
                  const isRenaming   = renamingBrand === brand.name
                  return (
                    <div
                      key={brand.name}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-2.5 transition-colors',
                        isDeleting ? 'opacity-50' : 'hover:border-zinc-200 hover:bg-zinc-50'
                      )}
                    >
                      {/* Editable color dot */}
                      <ColorPicker color={currentColor} onChange={c => saveBrandColor(brand.name, c)} />

                      {/* Brand name — inline rename input or plain text */}
                      <span className="text-sm font-medium flex-1 min-w-0 flex items-center gap-2">
                        {isRenaming ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameBrand(brand.name, renameValue)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameBrand(brand.name, renameValue)
                              if (e.key === 'Escape') setRenamingBrand(null)
                            }}
                            disabled={renameSaving}
                            className="flex-1 min-w-0 bg-white border border-zinc-300 rounded-lg px-2 py-0.5 text-sm outline-none focus:border-zinc-500"
                          />
                        ) : (
                          <>
                            <span className="truncate">{brand.name}</span>
                            {brand.isOwn && (
                              <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full shrink-0">
                                Yours
                              </span>
                            )}
                          </>
                        )}
                      </span>

                      {/* Source badge */}
                      {!isRenaming && (
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                          brand.source === 'manual'
                            ? 'text-zinc-500 bg-white border-zinc-200'
                            : 'text-zinc-400 bg-zinc-50 border-zinc-100'
                        )}>
                          {brand.source === 'manual' ? 'Manual' : 'Imported'}
                        </span>
                      )}

                      {/* Platform badges */}
                      {!isRenaming && brand.platforms.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          {brand.platforms.map(p => {
                            const label = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
                            const key   = label as keyof typeof PLATFORM_COLORS
                            return (
                              <span key={p}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded border border-transparent text-white"
                                style={{ background: PLATFORM_COLORS[key] ?? '#94a3b8' }}>
                                {label}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Rename button — visible on hover */}
                      {!isRenaming && (
                        <button
                          onClick={() => { setRenamingBrand(brand.name); setRenameValue(brand.name) }}
                          disabled={isDeleting}
                          title="Rename brand"
                          className="opacity-0 group-hover:opacity-100 shrink-0 size-6 flex items-center justify-center rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-all disabled:pointer-events-none"
                        >
                          <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M11.5 2.5a2.121 2.121 0 0 1 3 3L5 15H2v-3L11.5 2.5Z" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}

                      {/* Delete button — visible on hover */}
                      {!isRenaming && (
                        <button
                          onClick={() => handleDeleteBrand(brand.name)}
                          disabled={isDeleting}
                          title="Remove brand"
                          className="opacity-0 group-hover:opacity-100 shrink-0 size-6 flex items-center justify-center rounded-lg text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:pointer-events-none"
                        >
                          {isDeleting
                            ? <Loader2 className="size-3 animate-spin text-zinc-400" />
                            : <Trash2 className="size-3" />
                          }
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Sync note for imported brands */}
            {brands.some(b => b.source === 'sync') && (
              <p className="mt-3 text-[11px] text-zinc-400">
                Imported brands re-appear after a sync if deleted. To permanently exclude a brand, remove it from your data source.
              </p>
            )}
          </div>
        </div>

        {/* Right column: settings */}
        <div className="space-y-4">
          <SectionCard title="Data Refresh" description="How often to pull new ad data from connected sources.">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Refresh cadence</p>
                <Select value={refreshCadence} onValueChange={setRefreshCadence}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly" className="text-xs">Every hour</SelectItem>
                    <SelectItem value="6h" className="text-xs">Every 6 hours</SelectItem>
                    <SelectItem value="daily" className="text-xs">Once daily (recommended)</SelectItem>
                    <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                    <SelectItem value="manual" className="text-xs">Manual only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-zinc-50 rounded-md px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Next scheduled sync</p>
                <p className="text-xs font-medium mt-0.5">Today at 20:00</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Spend Estimation" description="Model used to estimate weekly ad spend from impression data.">
            <Select value={spendModel} onValueChange={setSpendModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpm" className="text-xs">CPM-based (default)</SelectItem>
                <SelectItem value="reach" className="text-xs">Reach × frequency</SelectItem>
                <SelectItem value="manual" className="text-xs">Manual benchmarks</SelectItem>
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard title="AI Enrichment" description="Automatically score and classify new ads using the configured AI model.">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs">Auto-enrich new ads</span>
                <button
                  onClick={() => setAiEnrichment(v => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    aiEnrichment ? 'bg-emerald-500' : 'bg-zinc-200'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block size-3.5 rounded-full bg-white shadow transition-transform',
                      aiEnrichment ? 'translate-x-4' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
              <div className="bg-zinc-50 rounded-md px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Model</p>
                <p className="text-xs font-medium mt-0.5">google/gemini-flash-1.5</p>
              </div>
              <div className="bg-zinc-50 rounded-md px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Enriched this week</p>
                <p className="text-xs font-medium mt-0.5">38 ads</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Report Scope" description="Define which funnel stages and topics are active in reporting.">
            <div className="space-y-2">
              {['See', 'Think', 'Do', 'Care'].map(stage => (
                <div key={stage} className="flex items-center justify-between text-xs">
                  <span>{stage}-stage</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
