'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react'
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
import { trackedBrands } from '@/components/dashboard/mock-data'
import { cn } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  Meta:     '#1877F2',
  Google:   '#34A853',
  LinkedIn: '#0A66C2',
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
  const [brands, setBrands] = useState(trackedBrands)
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

  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/workspace/profile?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (d.companyName      !== undefined) setCompanyName(d.companyName)
        if (d.industry         !== undefined) setIndustry(d.industry)
        if (d.website          !== undefined) setWebsite(d.website)
        if (d.brandDescription !== undefined) setBrandDescription(d.brandDescription)
        if (d.targetAudience   !== undefined) setTargetAudience(d.targetAudience)
        if (d.aiContext        !== undefined) setAiContext(d.aiContext)
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
      body: JSON.stringify({ workspaceId, name: wsName, slug: wsSlug, ownBrand: wsOwnBrand }),
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

  const wsChanged = wsName !== workspaceName || wsSlug !== workspaceSlug || wsOwnBrand !== initialOwnBrand

  function toggleBrand(id: string) {
    setBrands(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b))
  }

  function togglePlatform(brandId: string, platform: 'Meta' | 'Google' | 'LinkedIn') {
    setBrands(prev => prev.map(b => {
      if (b.id !== brandId) return b
      const has = b.platforms.includes(platform)
      return {
        ...b,
        platforms: has ? b.platforms.filter(p => p !== platform) : [...b.platforms, platform]
      }
    }))
  }

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

      {/* Workspace details */}
      <div className="bg-white rounded-lg border border-border shadow-sm p-5 mb-4 max-w-lg">
        <p className="text-sm font-semibold mb-0.5">Workspace Details</p>
        <p className="text-xs text-muted-foreground mb-4">Change your workspace name or URL slug.</p>

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
            <Label htmlFor="ws-own-brand" className="text-xs">Your brand name</Label>
            <Input
              id="ws-own-brand"
              value={wsOwnBrand}
              onChange={e => setWsOwnBrand(e.target.value)}
              placeholder="e.g. ORLEN"
              className="h-8 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Used in the Brand Deep Dive view to show your brand vs market.</p>
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

      {/* ── AI Intelligence Profile ── */}
      <div className="bg-white rounded-lg border border-border shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-zinc-400" />
          <p className="text-sm font-semibold">AI Intelligence Profile</p>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Tell Claude who you are. This context is injected into every AI conversation so responses are grounded in your brand, market, and objectives — not generic assumptions.
        </p>

        {!profileLoaded ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-8 bg-zinc-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name" className="text-xs">Company name <span className="text-muted-foreground font-normal">(official)</span></Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Orlen S.A."
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
                placeholder="e.g. https://orlen.pl"
                className="h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target-audience" className="text-xs">Target audience</Label>
              <Input
                id="target-audience"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="e.g. Polish drivers, fleet operators, families"
                className="h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="brand-description" className="text-xs">Brand description <span className="text-muted-foreground font-normal">(positioning, differentiators)</span></Label>
              <Textarea
                id="brand-description"
                value={brandDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBrandDescription(e.target.value)}
                placeholder="e.g. Poland's largest petrol company. Known for the VITAY loyalty programme, EV charging network, and premium fuels. Expanding across Central Europe."
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
              : <><Sparkles className="size-3" /> Save AI profile</>
            }
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Tracked brands - takes 2 cols */}
        <div className="xl:col-span-2">
          <SectionCard
            title="Tracked Brands"
            description="Select which competitors to monitor. Toggle active/inactive without losing configuration."
          >
            <div className="space-y-2">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                    brand.active ? 'border-border bg-zinc-50/50' : 'border-dashed border-zinc-200 bg-white opacity-60'
                  )}
                >
                  {/* Color dot */}
                  <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: brand.color }} />

                  {/* Brand name */}
                  <span className="text-sm font-medium w-28 shrink-0">{brand.name}</span>

                  {/* Platform toggles */}
                  <div className="flex items-center gap-1.5 flex-1">
                    {(['Meta', 'Google', 'LinkedIn'] as const).map(p => {
                      const on = brand.platforms.includes(p)
                      return (
                        <button
                          key={p}
                          onClick={() => brand.active && togglePlatform(brand.id, p)}
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors',
                            on
                              ? 'border-transparent text-white'
                              : 'border-zinc-200 text-zinc-400 bg-white',
                            !brand.active && 'cursor-not-allowed'
                          )}
                          style={on ? { backgroundColor: PLATFORM_COLORS[p] } : {}}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium tabular-nums">{brand.adsTracked.toLocaleString()} ads</p>
                    <p className="text-[10px] text-muted-foreground">last seen {brand.lastSeen}</p>
                  </div>

                  {/* Toggle active */}
                  <button
                    onClick={() => toggleBrand(brand.id)}
                    className={cn(
                      'ml-2 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors shrink-0',
                      brand.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:bg-zinc-100'
                    )}
                  >
                    {brand.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              ))}

              <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-1 px-4 py-2 rounded-lg border border-dashed border-zinc-200 w-full hover:border-zinc-300 transition-colors">
                <Plus className="size-3.5" />
                Add brand to track
              </button>
            </div>
          </SectionCard>
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
