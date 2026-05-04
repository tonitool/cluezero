'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, CheckCircle2 } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AlertEvent {
  id: string
  rule_id: string | null
  rule_name: string
  message: string
  severity: string
  read: boolean
  created_at: string
}

interface AlertRule {
  id: string
  name: string
  condition_type: string
  threshold: number
  enabled: boolean
  trigger_count: number
  last_triggered_at: string | null
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'warning') {
    return <Badge className="text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200 border">{severity}</Badge>
  }
  return <Badge className="text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200 border">{severity}</Badge>
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatTriggerTime(iso: string | null): string {
  if (!iso) return 'Never triggered'
  return `Last triggered ${formatTime(iso)}`
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg border border-border p-5 h-20" />
      ))}
    </div>
  )
}

interface Props {
  workspaceId?: string
}

export function AlertsView({ workspaceId }: Props) {
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return }
    setLoading(true)
    try {
      const [evRes, ruRes] = await Promise.all([
        fetch(`/api/alerts/events?workspaceId=${workspaceId}`),
        fetch(`/api/alerts/rules?workspaceId=${workspaceId}`),
      ])
      const evData = await evRes.json()
      const ruData = await ruRes.json()
      if (Array.isArray(evData.events)) setEvents(evData.events)
      if (Array.isArray(ruData.rules)) setRules(ruData.rules)
    } catch {
      // silently fail — keep empty state
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchData() }, [fetchData])

  async function markRead(eventId: string) {
    if (!workspaceId) return
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, read: true } : e))
    await fetch('/api/alerts/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, workspaceId }),
    })
  }

  async function toggleRule(ruleId: string, enabled: boolean) {
    if (!workspaceId) return
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r))
    await fetch('/api/alerts/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId, workspaceId, enabled }),
    })
  }

  const unreadEvents = events.filter(e => !e.read)
  const activeRules = rules.filter(r => r.enabled).length

  return (
    <div>
      <SectionHeader
        title="Alerts"
        description="Get notified when the competitive landscape changes"
      >
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => alert('Custom rules coming soon')}
        >
          <Plus className="size-3.5" />
          New Alert
        </Button>
      </SectionHeader>

      {/* Summary */}
      <div className="flex items-center gap-6 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="size-3.5 text-emerald-600" />
          <span className="text-sm font-medium">{activeRules} active rules</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{unreadEvents.length} unread alerts</span>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Recent Alerts */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3">Recent Alerts</h3>
            {unreadEvents.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-zinc-200 px-5 py-8 text-center text-sm text-muted-foreground">
                No unread alerts — you&apos;re all caught up.
              </div>
            ) : (
              <div className="space-y-2">
                {unreadEvents.map(event => (
                  <div
                    key={event.id}
                    className="bg-white rounded-lg border border-border shadow-sm p-4 flex items-start gap-4"
                  >
                    <div className={cn(
                      'size-8 rounded-lg flex items-center justify-center shrink-0',
                      event.severity === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                    )}>
                      <Bell className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold">{event.rule_name}</span>
                        <SeverityBadge severity={event.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{event.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTime(event.created_at)}</p>
                    </div>
                    <button
                      onClick={() => markRead(event.id)}
                      className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 border border-zinc-200 rounded px-2 py-1 hover:border-zinc-300 transition-colors"
                    >
                      Mark read
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Rules */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Alert Rules</h3>
            {rules.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-zinc-200 px-5 py-8 text-center text-sm text-muted-foreground">
                No alert rules yet. Sync your data to auto-create default rules.
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className={cn(
                      'bg-white rounded-lg border shadow-sm p-5 transition-opacity',
                      rule.enabled ? 'border-border' : 'border-zinc-200 opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'size-9 rounded-lg flex items-center justify-center shrink-0',
                        rule.enabled ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-400'
                      )}>
                        <Bell className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{rule.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Threshold: {rule.threshold}</p>
                          </div>
                          {/* Toggle */}
                          <button
                            onClick={() => toggleRule(rule.id, !rule.enabled)}
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
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {rule.trigger_count > 0 && (
                            <Badge variant="outline" className="text-[10px] font-medium text-amber-600 border-amber-200 bg-amber-50">
                              {rule.trigger_count}× triggered
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatTriggerTime(rule.last_triggered_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add rule hint */}
          <button
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-3 px-5 py-3 rounded-lg border border-dashed border-zinc-200 w-full hover:border-zinc-300 transition-colors"
            onClick={() => alert('Custom rules coming soon')}
          >
            <Plus className="size-3.5" />
            Create a new alert rule…
          </button>
        </>
      )}
    </div>
  )
}
