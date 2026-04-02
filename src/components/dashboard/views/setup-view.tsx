'use client'

import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export function SetupView() {
  const [brands, setBrands] = useState(trackedBrands)
  const [refreshCadence, setRefreshCadence] = useState('daily')
  const [aiEnrichment, setAiEnrichment] = useState(true)
  const [spendModel, setSpendModel] = useState('cpm')
  const [saved, setSaved] = useState(false)

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
