'use client'

import { useState } from 'react'
import { Bell, BellOff, Plus, Zap, Mail, MonitorSmartphone, Clock, CheckCircle2 } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { alertRules } from '@/components/dashboard/mock-data'
import { cn } from '@/lib/utils'

const CHANNEL_ICONS = {
  email:    Mail,
  'in-app': MonitorSmartphone,
  both:     Zap,
}

const CHANNEL_LABELS = {
  email:    'Email',
  'in-app': 'In-app',
  both:     'Email + In-app',
}

const FREQ_LABELS = {
  instant: 'Instant',
  daily:   'Daily digest',
  weekly:  'Weekly digest',
}

function formatTriggerTime(iso: string | null): string {
  if (!iso) return 'Never triggered'
  const d = new Date(iso)
  return `Last triggered ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function AlertsView() {
  const [rules, setRules] = useState(alertRules)

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const active = rules.filter(r => r.enabled).length

  return (
    <div>
      <SectionHeader
        title="Alerts"
        description="Get notified when the competitive landscape changes"
      >
        <Button size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          New Alert
        </Button>
      </SectionHeader>

      {/* Summary */}
      <div className="flex items-center gap-6 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="size-3.5 text-emerald-600" />
          <span className="text-sm font-medium">{active} active alerts</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{rules.reduce((s, r) => s + r.triggerCount, 0)} total triggers this month</span>
        </div>
      </div>

      {/* Alert cards */}
      <div className="space-y-3">
        {rules.map(rule => {
          const ChannelIcon = CHANNEL_ICONS[rule.channel]
          return (
            <div
              key={rule.id}
              className={cn(
                'bg-white rounded-lg border shadow-sm p-5 transition-opacity',
                rule.enabled ? 'border-border' : 'border-zinc-200 opacity-60'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'size-9 rounded-lg flex items-center justify-center shrink-0',
                  rule.enabled ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-400'
                )}>
                  <Bell className="size-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{rule.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rule.condition}</p>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
                        rule.enabled ? 'bg-emerald-500' : 'bg-zinc-200'
                      )}
                    >
                      <span className={cn(
                        'inline-block size-3.5 rounded-full bg-white shadow transition-transform',
                        rule.enabled ? 'translate-x-4' : 'translate-x-1'
                      )} />
                    </button>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <Badge variant="outline" className="text-[10px] gap-1 font-medium">
                      <ChannelIcon className="size-2.5" />
                      {CHANNEL_LABELS[rule.channel]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1 font-medium">
                      <Clock className="size-2.5" />
                      {FREQ_LABELS[rule.frequency]}
                    </Badge>
                    {rule.triggerCount > 0 && (
                      <Badge variant="outline" className="text-[10px] font-medium text-amber-600 border-amber-200 bg-amber-50">
                        {rule.triggerCount}× triggered
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatTriggerTime(rule.lastTriggered)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state hint */}
      <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-3 px-5 py-3 rounded-lg border border-dashed border-zinc-200 w-full hover:border-zinc-300 transition-colors">
        <Plus className="size-3.5" />
        Create a new alert rule…
      </button>
    </div>
  )
}
