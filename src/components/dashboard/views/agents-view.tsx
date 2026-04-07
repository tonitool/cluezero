'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Eye, CheckCircle2, AlertCircle, Loader2, Play, Settings,
  ChevronDown, ChevronUp, Clock, Zap, Bell, Mail, Hash,
  TrendingUp, TrendingDown, Minus, RefreshCcw, ArrowRight,
  ListChecks, Link2, ChevronRight,
} from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Finding {
  title:    string
  detail:   string
  severity: 'high' | 'medium' | 'low'
  brand?:   string
}

interface ActionTaken {
  type:   'slack' | 'email' | 'brief' | 'asana' | 'clickup'
  status: 'sent' | 'failed' | 'skipped'
  detail: string
}

interface ProductivityConn {
  id:           string
  platform:     'asana' | 'clickup'
  account_name: string | null
  config:       Record<string, string | null>
  status:       string
}

interface AgentRun {
  id:            string
  agent_type:    string
  status:        'running' | 'completed' | 'failed'
  started_at:    string
  completed_at:  string | null
  summary:       string | null
  findings:      Finding[] | null
  actions_taken: ActionTaken[] | null
  error:         string | null
}

interface Schedule {
  enabled:           boolean
  run_day:           string
  run_hour:          number
  slack_webhook_url: string | null
  notify_email:      string | null
  last_run_at:       string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const SEVERITY_CONFIG = {
  high:   { icon: TrendingUp,   color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-100' },
  medium: { icon: Minus,        color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
  low:    { icon: TrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
}

// ─── Run card ─────────────────────────────────────────────────────────────────

function RunCard({ run }: { run: AgentRun }) {
  const [open, setOpen] = useState(false)
  const isRunning   = run.status === 'running'
  const isFailed    = run.status === 'failed'
  const highCount   = run.findings?.filter(f => f.severity === 'high').length ?? 0
  const actionCount = run.actions_taken?.filter(a => a.status === 'sent').length ?? 0

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
      isRunning ? 'border-indigo-200' : isFailed ? 'border-rose-200' : 'border-border'
    )}>
      <button
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-zinc-50/50 transition-colors"
        onClick={() => !isRunning && setOpen(v => !v)}
      >
        <div className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          isRunning ? 'bg-indigo-100' : isFailed ? 'bg-rose-100' : 'bg-emerald-100'
        )}>
          {isRunning
            ? <Loader2 className="size-4 text-indigo-600 animate-spin" />
            : isFailed
              ? <AlertCircle className="size-4 text-rose-600" />
              : <CheckCircle2 className="size-4 text-emerald-600" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {isRunning ? 'Running analysis…' : isFailed ? 'Analysis failed' : 'Weekly Competitive Brief'}
            </span>
            {highCount > 0 && (
              <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 border-rose-200">
                {highCount} high-priority
              </Badge>
            )}
            {actionCount > 0 && (
              <Badge variant="outline" className="text-[10px] text-indigo-600 bg-indigo-50 border-indigo-200">
                {actionCount} action{actionCount > 1 ? 's' : ''} sent
              </Badge>
            )}
          </div>
          {run.summary && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{run.summary}</p>
          )}
          {run.error && (
            <p className="text-xs text-rose-600 mt-1">{run.error}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Clock className="size-3" /> {fmtDate(run.started_at)}
          </p>
        </div>

        {!isRunning && (run.findings?.length ?? 0) > 0 && (
          <div className="shrink-0 mt-1">
            {open ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
          </div>
        )}
      </button>

      {open && run.findings && run.findings.length > 0 && (
        <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Findings</p>
          {run.findings.map((f, i) => {
            const cfg  = SEVERITY_CONFIG[f.severity]
            const Icon = cfg.icon
            return (
              <div key={i} className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5', cfg.bg)}>
                <Icon className={cn('size-3.5 shrink-0 mt-0.5', cfg.color)} />
                <div>
                  <p className="text-xs font-semibold">
                    {f.title}
                    {f.brand && <span className="font-normal text-muted-foreground ml-1">({f.brand})</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{f.detail}</p>
                </div>
              </div>
            )
          })}

          {run.actions_taken && run.actions_taken.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground pt-1">Actions taken</p>
              <div className="flex gap-2 flex-wrap">
                {run.actions_taken.map((a, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1 border',
                    a.status === 'sent'   ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    a.status === 'failed' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                            'bg-zinc-50 border-zinc-200 text-zinc-500'
                  )}>
                    {a.type === 'slack'   ? <Hash className="size-3" /> :
                     a.type === 'email'   ? <Mail className="size-3" /> :
                     a.type === 'asana'   ? <ListChecks className="size-3" /> :
                     a.type === 'clickup' ? <ListChecks className="size-3" /> :
                     <CheckCircle2 className="size-3" />}
                    {a.type} · {a.status}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Productivity connections section ────────────────────────────────────────

function ProductivitySection({ workspaceId }: { workspaceId: string }) {
  const [conns,   setConns]   = useState<ProductivityConn[]>([])
  const [loading, setLoading] = useState(true)

  // Asana project picker state
  const [asanaWorkspaces, setAsanaWorkspaces] = useState<{
    gid: string; name: string; projects: { gid: string; name: string }[]
  }[]>([])
  const [asanaProjectGid,  setAsanaProjectGid]  = useState('')
  const [asanaWorkspaceGid, setAsanaWorkspaceGid] = useState('')
  const [savingAsana, setSavingAsana] = useState(false)

  // ClickUp list picker state
  const [clickupToken,  setClickupToken]  = useState('')
  const [clickupLists,  setClickupLists]  = useState<{ id: string; name: string; spaceId: string }[]>([])
  const [clickupTeams,  setClickupTeams]  = useState<{ id: string; name: string }[]>([])
  const [clickupSpaces, setClickupSpaces] = useState<{ id: string; name: string; teamId: string }[]>([])
  const [clickupListId, setClickupListId] = useState('')
  const [connectingClickUp, setConnectingClickUp] = useState(false)
  const [savingClickUp,     setSavingClickUp]      = useState(false)
  const [clickupError,      setClickupError]       = useState('')

  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/connections/list?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        setConns(d.productivityConnections ?? [])
      })
      .finally(() => setLoading(false))
  }, [workspaceId])

  const asanaConn  = conns.find(c => c.platform === 'asana')
  const clickupConn = conns.find(c => c.platform === 'clickup')

  async function loadAsanaProjects() {
    const res = await fetch(`/api/connections/asana/projects?workspaceId=${workspaceId}`)
    const data = await res.json()
    if (data.workspaces) setAsanaWorkspaces(data.workspaces)
    if (data.currentConfig?.workspace_gid) setAsanaWorkspaceGid(data.currentConfig.workspace_gid)
    if (data.currentConfig?.project_gid)   setAsanaProjectGid(data.currentConfig.project_gid)
  }

  async function saveAsanaConfig() {
    if (!asanaProjectGid) return
    setSavingAsana(true)
    const ws = asanaWorkspaces.find(w => w.gid === asanaWorkspaceGid)
    const proj = ws?.projects.find(p => p.gid === asanaProjectGid)
    await fetch('/api/connections/asana/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        workspaceGid:  ws?.gid ?? '',
        workspaceName: ws?.name ?? '',
        projectGid:    asanaProjectGid,
        projectName:   proj?.name ?? '',
      }),
    })
    setSavingAsana(false)
    // Refresh connections
    const r = await fetch(`/api/connections/list?workspaceId=${workspaceId}`).then(x => x.json())
    setConns(r.productivityConnections ?? [])
  }

  async function connectClickUp() {
    if (!clickupToken.trim()) return
    setConnectingClickUp(true)
    setClickupError('')
    const res = await fetch('/api/connections/clickup/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, apiToken: clickupToken }),
    })
    const data = await res.json()
    setConnectingClickUp(false)
    if (!res.ok) { setClickupError(data.error ?? 'Connection failed'); return }
    setClickupTeams(data.teams ?? [])
    setClickupSpaces(data.spaces ?? [])
    setClickupLists(data.lists ?? [])
    // Refresh connections
    const r = await fetch(`/api/connections/list?workspaceId=${workspaceId}`).then(x => x.json())
    setConns(r.productivityConnections ?? [])
  }

  async function saveClickUpConfig() {
    if (!clickupListId) return
    setSavingClickUp(true)
    const list  = clickupLists.find(l => l.id === clickupListId)
    const space = clickupSpaces.find(s => s.id === list?.spaceId)
    const team  = clickupTeams.find(t => t.id === space?.teamId)
    await fetch('/api/connections/clickup/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        teamId:   team?.id  ?? '',
        teamName: team?.name ?? '',
        spaceId:  space?.id  ?? '',
        spaceName: space?.name ?? '',
        listId:   clickupListId,
        listName: list?.name ?? '',
      }),
    })
    setSavingClickUp(false)
    const r = await fetch(`/api/connections/list?workspaceId=${workspaceId}`).then(x => x.json())
    setConns(r.productivityConnections ?? [])
  }

  if (loading) return null

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Task automation (high-severity alerts)
      </p>
      <p className="text-[11px] text-muted-foreground">
        When the agent finds a high-priority change, it automatically creates a task in your project tool.
      </p>

      {/* Asana */}
      <div className="rounded-lg border border-border bg-zinc-50/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Asana wordmark colour */}
            <div className="size-5 rounded bg-[#f06a6a] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-[9px]">A</span>
            </div>
            <span className="text-xs font-medium">Asana</span>
            {asanaConn && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">
                Connected
              </span>
            )}
          </div>
          {!asanaConn && (
            <a
              href={`/api/connections/asana?workspaceId=${workspaceId}`}
              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              Connect <ChevronRight className="size-3" />
            </a>
          )}
        </div>

        {asanaConn && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Account: {asanaConn.account_name ?? 'Asana'}
              {asanaConn.config?.project_name && (
                <> · Project: <strong>{asanaConn.config.project_name}</strong></>
              )}
            </p>
            {asanaWorkspaces.length === 0 ? (
              <button
                onClick={loadAsanaProjects}
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Link2 className="size-3" /> Select project
              </button>
            ) : (
              <div className="space-y-2">
                <select
                  value={asanaProjectGid}
                  onChange={e => setAsanaProjectGid(e.target.value)}
                  className="w-full h-8 text-xs rounded-md border border-border px-2 bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— pick a project —</option>
                  {asanaWorkspaces.flatMap(ws =>
                    ws.projects.map(p => (
                      <option key={p.gid} value={p.gid}>{ws.name} / {p.name}</option>
                    ))
                  )}
                </select>
                <Button
                  size="sm" className="h-7 text-[11px] gap-1"
                  onClick={saveAsanaConfig} disabled={!asanaProjectGid || savingAsana}
                >
                  {savingAsana ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ClickUp */}
      <div className="rounded-lg border border-border bg-zinc-50/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded bg-[#7b68ee] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-[9px]">CU</span>
            </div>
            <span className="text-xs font-medium">ClickUp</span>
            {clickupConn && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">
                Connected
              </span>
            )}
          </div>
        </div>

        {!clickupConn && (
          <div className="space-y-2">
            <input
              value={clickupToken}
              onChange={e => setClickupToken(e.target.value)}
              placeholder="pk_xxxxxxxx… (personal API token)"
              className="w-full h-8 text-xs rounded-md border border-border px-2 bg-white focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
            {clickupError && <p className="text-[11px] text-rose-600">{clickupError}</p>}
            <div className="flex items-center justify-between">
              <a
                href="https://app.clickup.com/settings/apps"
                target="_blank" rel="noopener"
                className="text-[10px] text-muted-foreground underline"
              >
                Get your token ↗
              </a>
              <Button
                size="sm" className="h-7 text-[11px] gap-1"
                onClick={connectClickUp}
                disabled={!clickupToken.trim() || connectingClickUp}
              >
                {connectingClickUp ? <Loader2 className="size-3 animate-spin" /> : null}
                Connect
              </Button>
            </div>
          </div>
        )}

        {clickupConn && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Account: {clickupConn.account_name ?? 'ClickUp'}
              {clickupConn.config?.list_name && (
                <> · List: <strong>{clickupConn.config.list_name}</strong></>
              )}
            </p>
            {clickupLists.length > 0 && (
              <div className="space-y-2">
                <select
                  value={clickupListId}
                  onChange={e => setClickupListId(e.target.value)}
                  className="w-full h-8 text-xs rounded-md border border-border px-2 bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— pick a list —</option>
                  {clickupLists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <Button
                  size="sm" className="h-7 text-[11px] gap-1"
                  onClick={saveClickUpConfig} disabled={!clickupListId || savingClickUp}
                >
                  {savingClickUp ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Schedule settings panel ──────────────────────────────────────────────────

function SchedulePanel({
  workspaceId, schedule, onSaved,
}: {
  workspaceId: string
  schedule:    Schedule | null
  onSaved:     (s: Schedule) => void
}) {
  const [enabled,      setEnabled]      = useState(schedule?.enabled ?? false)
  const [runDay,       setRunDay]       = useState(schedule?.run_day ?? 'monday')
  const [runHour,      setRunHour]      = useState(schedule?.run_hour ?? 7)
  const [slackWebhook, setSlackWebhook] = useState(schedule?.slack_webhook_url ?? '')
  const [notifyEmail,  setNotifyEmail]  = useState(schedule?.notify_email ?? '')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res  = await fetch('/api/agents/watch/schedule', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          enabled,
          runDay,
          runHour,
          slackWebhookUrl: slackWebhook || null,
          notifyEmail:     notifyEmail  || null,
        }),
      })
      const data = await res.json()
      if (data.schedule) { onSaved(data.schedule); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } finally { setSaving(false) }
  }

  const days  = ['daily', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Schedule Settings</p>
        {schedule?.last_run_at && (
          <span className="text-[11px] text-muted-foreground">Last run {timeAgo(schedule.last_run_at)}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Automated weekly brief</p>
          <p className="text-xs text-muted-foreground mt-0.5">Agent runs automatically and sends outputs to your team</p>
        </div>
        <button
          onClick={() => setEnabled(v => !v)}
          className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', enabled ? 'bg-indigo-600' : 'bg-zinc-200')}
        >
          <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Run day</label>
              <select
                value={runDay} onChange={e => setRunDay(e.target.value)}
                className="w-full h-9 text-sm rounded-lg border border-border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {days.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Run time (UTC)</label>
              <select
                value={runHour} onChange={e => setRunHour(Number(e.target.value))}
                className="w-full h-9 text-sm rounded-lg border border-border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Notification outputs</p>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                <Hash className="size-3.5 text-[#611f69]" /> Slack webhook URL
              </label>
              <input
                value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                className="w-full h-9 text-sm rounded-lg border border-border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Create an Incoming Webhook in Slack —{' '}
                <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener" className="underline">guide</a>
              </p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                <Mail className="size-3.5 text-indigo-500" /> Email address
              </label>
              <input
                value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)}
                placeholder="team@yourcompany.com" type="email"
                className="w-full h-9 text-sm rounded-lg border border-border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </>
      )}

      <div className="border-t border-border pt-4">
        <ProductivitySection workspaceId={workspaceId} />
      </div>

      <div className="flex justify-end pt-1 border-t border-border">
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-3 animate-spin" /> : saved ? <CheckCircle2 className="size-3" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface Props {
  workspaceId?:  string
  connectionId?: string
  onNavigate?:   (view: string) => void
}

export function AgentsView({ workspaceId, connectionId, onNavigate }: Props) {
  const [runs,         setRuns]         = useState<AgentRun[]>([])
  const [schedule,     setSchedule]     = useState<Schedule | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [running,      setRunning]      = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    const [runsRes, schedRes] = await Promise.all([
      fetch(`/api/agents/watch/runs?workspaceId=${workspaceId}`).then(r => r.json()),
      fetch(`/api/agents/watch/schedule?workspaceId=${workspaceId}`).then(r => r.json()),
    ])
    setRuns(runsRes.runs ?? [])
    setSchedule(schedRes.schedule ?? null)
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { loadData() }, [loadData])

  async function handleRunNow() {
    if (!workspaceId || running) return
    setRunning(true)
    setError(null)
    // Optimistically add a running card
    const tempRun: AgentRun = {
      id: 'temp', agent_type: 'competitive_watch', status: 'running',
      started_at: new Date().toISOString(), completed_at: null,
      summary: null, findings: null, actions_taken: null, error: null,
    }
    setRuns(prev => [tempRun, ...prev])
    try {
      const res  = await fetch('/api/agents/watch/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, connectionId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Agent run failed')
      await loadData()
    } catch (err) {
      setError(String(err))
      await loadData()
    } finally {
      setRunning(false)
    }
  }

  const isAgentActive = schedule?.enabled ?? false

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <SectionHeader
          title="Watch Agent"
          description="Monitors your competitive landscape weekly — surfaces what changed and alerts your team automatically"
        />
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowSettings(v => !v)}>
            <Settings className="size-3.5" />
            {showSettings ? 'Hide settings' : 'Settings'}
          </Button>
          <Button
            size="sm" className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
            onClick={handleRunNow} disabled={running || !workspaceId}
          >
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            {running ? 'Running…' : 'Run now'}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className={cn('size-2 rounded-full', isAgentActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300')} />
          <span className="text-sm font-medium">{isAgentActive ? 'Scheduled' : 'Not scheduled'}</span>
        </div>
        {isAgentActive && schedule && (
          <span className="text-xs text-muted-foreground">
            Runs every {schedule.run_day} at {String(schedule.run_hour).padStart(2, '0')}:00 UTC
          </span>
        )}
        {schedule?.slack_webhook_url && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Hash className="size-3" /> Slack
          </div>
        )}
        {schedule?.notify_email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="size-3" /> {schedule.notify_email}
          </div>
        )}
        {!isAgentActive && (
          <button onClick={() => setShowSettings(true)} className="text-xs text-indigo-600 hover:underline ml-auto flex items-center gap-1">
            Set up schedule <ArrowRight className="size-3" />
          </button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground ml-auto" onClick={loadData}>
          <RefreshCcw className="size-3" />
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-xs text-rose-700 mb-4">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">Activity</p>

          {loading && !runs.length && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && !runs.length && (
            <div className="bg-white rounded-xl border border-dashed border-border p-10 flex flex-col items-center gap-3 text-center">
              <div className="size-12 rounded-full bg-indigo-50 flex items-center justify-center">
                <Eye className="size-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium">No runs yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Click <strong>Run now</strong> to trigger the agent manually, or set up a schedule to run every week automatically.
                </p>
              </div>
              <Button size="sm" className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={handleRunNow} disabled={running || !workspaceId}>
                {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                {running ? 'Running…' : 'Run now'}
              </Button>
            </div>
          )}

          {runs.map(run => <RunCard key={run.id} run={run} />)}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {showSettings ? (
            <SchedulePanel workspaceId={workspaceId ?? ''} schedule={schedule} onSaved={s => setSchedule(s)} />
          ) : (
            <>
              <div className="bg-white rounded-xl border border-border shadow-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Stats</p>
                <div className="space-y-3">
                  {[
                    { label: 'Total runs',          value: String(runs.filter(r => r.id !== 'temp').length) },
                    { label: 'Completed',            value: String(runs.filter(r => r.status === 'completed').length) },
                    { label: 'Last run',             value: runs.find(r => r.status === 'completed') ? timeAgo(runs.find(r => r.status === 'completed')!.started_at) : '—' },
                    { label: 'High-priority alerts', value: String(runs.reduce((s, r) => s + (r.findings?.filter(f => f.severity === 'high').length ?? 0), 0)) },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground text-xs">{stat.label}</span>
                      <span className="font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">How it works</p>
                <div className="space-y-2.5 text-xs text-indigo-800">
                  {[
                    { icon: Eye,        text: 'Monitors competitor spend, new ads, and PI shifts every week' },
                    { icon: Zap,        text: 'Identifies only meaningful changes — filters out noise' },
                    { icon: Bell,       text: 'Sends findings to Slack or email with recommended actions' },
                    { icon: TrendingUp, text: 'Builds a history of market movements over time' },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Icon className="size-3.5 shrink-0 mt-0.5" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigate?.('agent-performance')}
                className="w-full bg-white rounded-xl border border-border shadow-sm p-4 text-left hover:border-zinc-400 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Performance Brief</p>
                    <p className="text-xs text-muted-foreground mt-0.5">On-demand campaign + market analysis</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
