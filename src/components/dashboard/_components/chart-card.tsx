import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  height?: number
  action?: ReactNode
}

export function ChartCard({ title, description, children, className, height = 300, action }: ChartCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-border shadow-sm flex flex-col transition-shadow hover:shadow-md', className)}>
      <div className="flex items-start justify-between px-5 pt-5 pb-3 gap-4">
        <div>
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
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
