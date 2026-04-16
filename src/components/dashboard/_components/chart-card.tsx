import { ReactNode, useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  height?: number
  action?: ReactNode
  info?: string
}

export function ChartCard({ title, description, children, className, height = 300, action, info }: ChartCardProps) {
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
    <div className={cn('bg-white rounded-xl border border-border shadow-sm flex flex-col transition-shadow hover:shadow-md', className)}>
      <div className="flex items-start justify-between px-5 pt-5 pb-3 gap-4">
        <div className="flex items-start gap-1.5">
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {info && (
            <div ref={infoRef} className="relative mt-0.5">
              <button onClick={() => setShowInfo(v => !v)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <Info className="size-3.5" />
              </button>
              {showInfo && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-zinc-900 text-zinc-100 text-[11px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl z-50">
                  {info}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-zinc-900" />
                </div>
              )}
            </div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-5 pb-5" style={{ height }}>
        {children}
      </div>
    </div>
  )
}
