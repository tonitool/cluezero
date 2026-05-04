'use client'

import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { SlidingNumber } from '@/components/animate-ui/primitives/texts/sliding-number'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SPRING_FAST = { stiffness: 260, damping: 26, mass: 0.5 }

/** Extract a numeric value and its prefix/suffix from a display string like "€12,345" or "72%" */
function parseDisplayValue(value: string): { prefix: string; number: number; suffix: string; decimals: number } | null {
  const match = value.match(/^([^0-9-]*)(-?[\d,.]+)(.*)$/)
  if (!match) return null

  const prefix = match[1]
  const raw = match[2].replace(/,/g, '')
  const number = parseFloat(raw)
  if (isNaN(number)) return null

  const dotIdx = raw.indexOf('.')
  const decimals = dotIdx >= 0 ? raw.length - dotIdx - 1 : 0
  const suffix = match[3]

  return { prefix, number: Math.abs(number), suffix, decimals }
}

// ─── Component ───────────────────────────────────────────────────────────────

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

  const parsed = useMemo(() => parseDisplayValue(value), [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'bg-white rounded-lg border border-border p-5 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
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
        <p className="text-2xl font-bold tabular-nums leading-none">
          {parsed ? (
            <>
              {parsed.prefix}
              <SlidingNumber
                number={parsed.number}
                decimalPlaces={parsed.decimals}
                thousandSeparator=","
                transition={SPRING_FAST}
                inView
                inViewOnce
              />
              {parsed.suffix}
            </>
          ) : (
            value
          )}
        </p>
        {delta && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium mb-0.5',
              isUp && 'text-emerald-600',
              isDown && 'text-rose-500',
              !isUp && !isDown && 'text-muted-foreground',
            )}
          >
            {isUp && <ArrowUpRight className="size-3.5" />}
            {isDown && <ArrowDownRight className="size-3.5" />}
            {delta}
          </motion.span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'left' }}
        className={cn(
          'h-[3px] rounded-full mt-auto',
          isUp ? 'bg-emerald-500/40' : isDown ? 'bg-rose-400/40' : 'bg-border',
        )}
      />
    </motion.div>
  )
}
