'use client'

import { KpiCard } from '@/components/dashboard/_components/kpi-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { creativeScorecards, topCreatives } from '@/components/dashboard/mock-data'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const PLATFORM_COLORS: Record<string, string> = {
  Meta: '#1877F2',
  Google: '#34A853',
  LinkedIn: '#0A66C2',
}

function PiColor(pi: number): string {
  if (pi > 70) return '#16a34a'  // green-600
  if (pi > 50) return '#d97706'  // amber-600
  return '#dc2626'               // red-600
}

export function CreativeView() {
  return (
    <div>
      <SectionHeader
        title="Creative Benchmark"
        description="Top performing new creatives ranked by Performance Index"
      />

      {/* KPI Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {creativeScorecards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            delta={card.delta}
            direction="up"
          />
        ))}
      </div>

      {/* Section title */}
      <p className="text-sm font-semibold mb-4">Top 10 New Creatives This Week</p>

      {/* Creative cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {topCreatives.map((creative) => {
          const platformColor = PLATFORM_COLORS[creative.platform] ?? '#888'
          const piColor = PiColor(creative.performanceIndex)
          const sentimentPct = ((creative.sentiment + 1) / 2) * 100
          const brandInitial = creative.brand.charAt(0).toUpperCase()

          return (
            <div
              key={creative.id}
              className="bg-white rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {creative.thumbnail ? (
                  <img
                    src={creative.thumbnail}
                    alt={creative.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        parent.innerHTML = `<span class="text-2xl font-bold text-muted-foreground select-none">${brandInitial}</span>`
                      }
                    }}
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground select-none">
                    {brandInitial}
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="p-3">
                {/* Platform + PI row */}
                <div className="flex items-center justify-between gap-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border font-medium"
                    style={{ borderColor: platformColor, color: platformColor }}
                  >
                    {creative.platform}
                  </Badge>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: piColor }}
                  >
                    {creative.performanceIndex}
                  </span>
                </div>

                {/* Title */}
                <p className="line-clamp-2 text-xs font-medium mt-1 leading-snug">
                  {creative.title}
                </p>

                {/* Brand + Funnel row */}
                <div className="flex items-center justify-between mt-1.5 gap-1">
                  <span className="text-[10px] text-muted-foreground truncate">
                    {creative.brand}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {creative.funnelStage}
                  </span>
                </div>

                {/* Sentiment bar */}
                <div className="mt-2">
                  <p className="text-[10px] text-muted-foreground">Sentiment</p>
                  <Progress
                    value={sentimentPct}
                    className="h-1.5 mt-0.5"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
