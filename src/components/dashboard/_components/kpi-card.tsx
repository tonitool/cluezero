import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

interface KpiCardProps {
  label: string
  value: string
  delta?: string
  direction?: 'up' | 'down'
  subtitle?: string
  className?: string
  info?: string
}

export function KpiCard({ label, value, delta, direction, subtitle, className, info }: KpiCardProps) {
  const isUp = direction === 'up'
  const isDown = direction === 'down'
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showInfo) return
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showInfo])

  return (
    <div className={cn(
      'bg-white rounded-lg border border-border p-5 flex flex-col gap-3 shadow-sm',
      className
    )}>
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {info && (
          <div ref={infoRef} className="relative">
            <button onClick={() => setShowInfo(v => !v)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <Info className="size-3" />
            </button>
            {showInfo && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-zinc-900 text-zinc-100 text-[11px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl z-50 pointer-events-auto">
                {info}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-zinc-900" />
              </div>
            )}
          </div>
        )}
      </div>
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
