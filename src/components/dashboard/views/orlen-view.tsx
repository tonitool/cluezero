'use client'

import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/_components/chart-card'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { BRAND_COLORS } from '@/components/dashboard/_components/constants'
import {
  orlenVsMarketScorecards,
  competitorStrategyProfiles,
  marketActivityVsPresence,
  topOpportunities,
} from '@/components/dashboard/mock-data'
import { Badge } from '@/components/ui/badge'

const STRATEGY_COLORS = {
  awareness: '#6366F1',
  conversion: '#0EA5E9',
  innovation: '#10B981',
  localTargeting: '#F59E0B',
}

function advertiserToColorKey(advertiser: string): string {
  const map: Record<string, string> = {
    ORLEN: 'orlen',
    Aral: 'aral',
    'Circle K': 'circleK',
    ENI: 'eni',
    Esso: 'esso',
    Shell: 'shell',
  }
  return map[advertiser] ?? 'orlen'
}

function ScoreDotsWhitespace({ score }: { score: number }) {
  return (
    <span className="tracking-widest text-xs text-muted-foreground select-none">
      {Array.from({ length: 5 }, (_, i) =>
        i < score ? (
          <span key={i} className="text-amber-500">●</span>
        ) : (
          <span key={i} className="text-muted-foreground/30">○</span>
        )
      )}
    </span>
  )
}

function WhitespaceBadge({ level }: { level: string }) {
  if (level === 'High') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] px-1.5 py-0">
        High
      </Badge>
    )
  }
  if (level === 'Medium') {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        Medium
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
      Low
    </Badge>
  )
}

interface ScatterDotProps {
  cx?: number
  cy?: number
  payload?: { advertiser: string }
}

function ScatterDot({ cx = 0, cy = 0, payload }: ScatterDotProps) {
  const colorKey = advertiserToColorKey(payload?.advertiser ?? '')
  const color = BRAND_COLORS[colorKey] ?? '#888'
  return <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
}

export function OrlenView() {
  return (
    <div>
      <SectionHeader
        title="ORLEN vs Market"
        description="Scorecard comparison, competitor strategy profiles, and whitespace opportunities"
      />

      {/* Scorecard row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {orlenVsMarketScorecards.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-lg border border-border shadow-sm p-4"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {item.label}
            </p>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <p
                  className="text-2xl font-bold tabular-nums leading-none"
                  style={{ color: BRAND_COLORS.orlen }}
                >
                  {typeof item.orlen === 'number' && item.orlen >= 100
                    ? item.orlen.toLocaleString()
                    : item.orlen}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                  ORLEN
                </p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-2xl font-bold tabular-nums leading-none text-muted-foreground">
                  {typeof item.market === 'number' && item.market >= 100
                    ? item.market.toLocaleString()
                    : item.market}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                  Market
                </p>
              </div>
            </div>
            <div className="mt-3">
              {(() => {
                const orlenVal = Number(item.orlen)
                const marketVal = Number(item.market)
                const delta = orlenVal - marketVal
                const isUp = delta >= 0
                return (
                  <Badge
                    className={
                      isUp
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] px-1.5 py-0'
                        : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-50 text-[10px] px-1.5 py-0'
                    }
                  >
                    {isUp ? '+' : ''}
                    {delta % 1 !== 0 ? delta.toFixed(1) : delta}
                  </Badge>
                )
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-2">
        {/* Competitor Strategy Profiles */}
        <ChartCard title="Competitor Strategy Profiles" height={300}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={competitorStrategyProfiles}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="advertiser"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="awareness" name="Awareness" fill={STRATEGY_COLORS.awareness} />
                <Bar dataKey="conversion" name="Conversion" fill={STRATEGY_COLORS.conversion} />
                <Bar dataKey="innovation" name="Innovation" fill={STRATEGY_COLORS.innovation} />
                <Bar
                  dataKey="localTargeting"
                  name="Local Targeting"
                  fill={STRATEGY_COLORS.localTargeting}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Market Activity vs Presence */}
        <ChartCard title="Market Activity vs Presence" height={300}>
          <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="activity"
                  name="Activity"
                  label={{ value: 'Activity', position: 'insideBottom', offset: -2, fontSize: 11 }}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[20, 80]}
                />
                <YAxis
                  type="number"
                  dataKey="presence"
                  name="Presence"
                  label={{ value: 'Presence', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11 }}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[5, 25]}
                />
                <ZAxis type="number" dataKey="reach" range={[60, 200]} name="Reach (k)" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-white rounded-lg border border-border shadow-sm p-2 text-xs">
                        <p className="font-semibold mb-1">{d.advertiser}</p>
                        <p>Activity: {d.activity}</p>
                        <p>Presence: {d.presence}</p>
                        <p>Reach: {d.reach}k</p>
                      </div>
                    )
                  }}
                />
                <Scatter
                  data={marketActivityVsPresence}
                  shape={(props: ScatterDotProps) => <ScatterDot {...props} />}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 px-1">
            {marketActivityVsPresence.map((item) => {
              const key = advertiserToColorKey(item.advertiser)
              return (
                <div key={item.advertiser} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: BRAND_COLORS[key] }}
                  />
                  <span className="text-[11px] text-muted-foreground">{item.advertiser}</span>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* Top Opportunities table */}
      <div className="mt-4 bg-white rounded-lg border border-border shadow-sm">
        <p className="font-semibold text-sm px-5 pt-5 pb-3">Top Opportunities</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border bg-muted/40">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">
                  Topic
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                  Whitespace
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                  Opportunity
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                  Competitor Density
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {topOpportunities.map((row, i) => (
                <tr
                  key={row.topic}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                >
                  <td className="px-5 py-2.5 text-sm font-medium">{row.topic}</td>
                  <td className="px-3 py-2.5">
                    <WhitespaceBadge level={row.whitespace} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[260px]">
                    {row.reason}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {row.whitespace === 'High'
                      ? 'Low'
                      : row.whitespace === 'Medium'
                      ? 'Medium'
                      : 'High'}
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreDotsWhitespace score={row.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="h-2" />
      </div>
    </div>
  )
}
