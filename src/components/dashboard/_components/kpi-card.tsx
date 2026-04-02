import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  delta?: string
  direction?: 'up' | 'down'
  subtitle?: string
  className?: string
}

export function KpiCard({ label, value, delta, direction, subtitle, className }: KpiCardProps) {
  const isUp = direction === 'up'
  const isDown = direction === 'down'

  return (
    <div className={cn(
      'bg-white rounded-lg border border-border p-5 flex flex-col gap-3 shadow-sm',
      className
    )}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        {delta && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-medium mb-0.5',
            isUp && 'text-emerald-600',
            isDown && 'text-rose-500',
            !isUp && !isDown && 'text-muted-foreground',
          )}>
            {isUp && <ArrowUpRight className="size-3.5" />}
            {isDown && <ArrowDownRight className="size-3.5" />}
            {delta}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
      )}
      <div className={cn(
        'h-[3px] rounded-full mt-auto',
        isUp ? 'bg-emerald-500/40' : isDown ? 'bg-rose-400/40' : 'bg-border'
      )} />
    </div>
  )
}
