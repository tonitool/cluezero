'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, SlidersHorizontal, ImageIcon, Plug } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  Meta:     '#1877F2',
  Google:   '#34A853',
  LinkedIn: '#0A66C2',
}

const FUNNEL_COLORS: Record<string, string> = {
  See:   '#6366F1',
  Think: '#0EA5E9',
  Do:    '#10B981',
  Care:  '#F59E0B',
}

/** Deterministic brand color from brand name — works for any tenant */
function brandColor(name: string): string {
  const palette = [
    '#E4002B', '#0066B2', '#EC6B1E', '#5C5C5C', '#003087',
    '#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

function piColor(pi: number) {
  if (pi > 70) return '#16a34a'
  if (pi > 50) return '#d97706'
  return '#dc2626'
}

type FilterOption = string | 'All'

interface Creative {
  id: string
  platform: string
  performanceIndex: number
  title: string
  brand: string
  funnelStage: string
  sentiment: number
  thumbnail?: string
}

interface Props {
  workspaceId?: string
  connectionId?: string
  onNavigate?: (view: string) => void
}

export function CreativeLibraryView({ workspaceId, connectionId, onNavigate }: Props) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(!!workspaceId)

  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<FilterOption>('All')
  const [platformFilter, setPlatformFilter] = useState<FilterOption>('All')
  const [funnelFilter, setFunnelFilter] = useState<FilterOption>('All')
  const [sortBy, setSortBy] = useState<'pi' | 'sentiment' | 'newest'>('pi')

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }
    setLoading(true)
    const src = connectionId ? `&connectionId=${connectionId}` : ''
    fetch(`/api/data/performance?workspaceId=${workspaceId}${src}`)
      .then(r => r.json())
      .then(d => {
        if (d.hasData && Array.isArray(d.topCreatives)) setCreatives(d.topCreatives)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId, connectionId])

  const brands = useMemo(() => ['All', ...Array.from(new Set(creatives.map(c => c.brand)))], [creatives])
  const platforms = ['All', 'Meta', 'Google', 'LinkedIn']
  const funnelStages = ['All', 'See', 'Think', 'Do', 'Care']

  const filtered = useMemo(() => {
    let items = [...creatives]
    if (search) items = items.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.brand.toLowerCase().includes(search.toLowerCase()))
    if (brandFilter !== 'All') items = items.filter(c => c.brand === brandFilter)
    if (platformFilter !== 'All') items = items.filter(c => c.platform === platformFilter)
    if (funnelFilter !== 'All') items = items.filter(c => c.funnelStage === funnelFilter)
    if (sortBy === 'pi') items.sort((a, b) => b.performanceIndex - a.performanceIndex)
    else if (sortBy === 'sentiment') items.sort((a, b) => b.sentiment - a.sentiment)
    return items
  }, [creatives, search, brandFilter, platformFilter, funnelFilter, sortBy])

  function FilterBar<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground shrink-0">{label}:</span>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              'text-[11px] px-2.5 py-0.5 rounded-full border font-medium transition-colors',
              value === opt
                ? 'bg-foreground text-background border-foreground'
                : 'bg-white text-muted-foreground border-border hover:border-zinc-400'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  // Loading skeleton
  if (loading) return (
    <div>
      <SectionHeader title="Creative Library" description="All creatives from tracked competitors" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1,2,3,4,5,6,7,8,9,10].map(i => (
          <div key={i} className="rounded-xl bg-zinc-100 animate-pulse aspect-[3/4]" />
        ))}
      </div>
    </div>
  )

  // No workspace connected
  if (!workspaceId) return (
    <div>
      <SectionHeader title="Creative Library" description="All creatives from tracked competitors" />
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="size-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
          <ImageIcon className="size-7 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No workspace connected</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Connect a Snowflake data source and run a sync to see your competitor creatives here.</p>
        </div>
      </div>
    </div>
  )

  // Workspace connected but no creatives yet
  if (!loading && creatives.length === 0) return (
    <div>
      <SectionHeader title="Creative Library" description="All creatives from tracked competitors" />
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="size-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Plug className="size-7 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No creatives yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Your Creative Library will populate after you sync your Snowflake data source.
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('connections')}
            className="text-xs text-indigo-600 hover:underline"
          >
            Go to Connections →
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <SectionHeader
        title="Creative Library"
        description={`${filtered.length} creative${filtered.length !== 1 ? 's' : ''} from tracked competitors`}
      />

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4 mb-5 space-y-3">
        {/* Search + sort row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search creatives…"
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Sort:</span>
            {[
              { value: 'pi', label: 'PI Score' },
              { value: 'sentiment', label: 'Sentiment' },
              { value: 'newest', label: 'Newest' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value as typeof sortBy)}
                className={cn(
                  'text-[11px] px-2.5 py-0.5 rounded-full border font-medium transition-colors',
                  sortBy === opt.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-white text-muted-foreground border-border hover:border-zinc-400'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <FilterBar label="Brand"    options={brands as FilterOption[]}       value={brandFilter}    onChange={setBrandFilter} />
        <FilterBar label="Platform" options={platforms as FilterOption[]}    value={platformFilter} onChange={setPlatformFilter} />
        <FilterBar label="Funnel"   options={funnelStages as FilterOption[]} value={funnelFilter}   onChange={setFunnelFilter} />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No creatives match your filters.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {filtered.map(creative => {
            const pColor = PLATFORM_COLORS[creative.platform] ?? '#888'
            const bColor = brandColor(creative.brand)
            const sentimentPct = ((creative.sentiment + 1) / 2) * 100
            const brandInitial = creative.brand.charAt(0).toUpperCase()
            const fColor = FUNNEL_COLORS[creative.funnelStage] ?? '#888'

            return (
              <div
                key={creative.id}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative">
                  {creative.thumbnail ? (
                    <img
                      src={creative.thumbnail}
                      alt={creative.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = `<span class="text-2xl font-bold select-none" style="color:${bColor}">${brandInitial}</span>`
                        }
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold select-none" style={{ color: bColor }}>
                      {brandInitial}
                    </span>
                  )}
                  <div
                    className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: fColor }}
                  >
                    {creative.funnelStage}
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border font-medium" style={{ borderColor: pColor, color: pColor }}>
                      {creative.platform}
                    </Badge>
                    <span className="text-sm font-bold tabular-nums" style={{ color: piColor(creative.performanceIndex) }}>
                      {creative.performanceIndex}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium mt-1 leading-snug">{creative.title}</p>
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <span className="text-[10px] font-semibold truncate" style={{ color: bColor }}>
                      {creative.brand}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground">Sentiment</p>
                    <Progress value={sentimentPct} className="h-1.5 mt-0.5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
