'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, XCircle, AlertCircle, Clock,
  RefreshCcw, Plus, Loader2, ExternalLink, Trash2, Zap, PartyPopper, Settings2,
} from 'lucide-react'
import { ConnectionSettingsPanel } from '@/components/dashboard/_components/connection-settings-panel'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { SUPPORTED_CONNECTORS, type AppInfo, type AppInputField } from '@/lib/connectors'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnStatus = 'active' | 'pending' | 'error' | 'disconnected'

interface Connection {
  id: string
  name: string
  app_name: string
  logo_url: string | null
  status: ConnStatus
  last_sync_at: string | null
  last_sync_rows: number | null
  sync_status: string
  sync_progress: number | null
  sync_total: number | null
  sync_error: string | null
  created_at: string
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  active:       { icon: CheckCircle2, label: 'Connected',     color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  pending:      { icon: Clock,        label: 'Awaiting auth', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  error:        { icon: AlertCircle,  label: 'Error',         color: 'text-rose-600 bg-rose-50 border-rose-200' },
  disconnected: { icon: XCircle,      label: 'Disconnected',  color: 'text-zinc-400 bg-zinc-50 border-zinc-200' },
} as const

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Connector picker modal ───────────────────────────────────────────────────

function ConnectorPicker({
  onSelect,
  onClose,
}: {
  onSelect: (app: AppInfo) => void
  onClose: () => void
}) {
  const categories = [...new Set(SUPPORTED_CONNECTORS.flatMap(a => a.categories))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10"
      >
        <div className="mb-5">
          <h2 className="text-base font-semibold">Add a data source</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect a data source via Composio. OAuth is handled automatically.
          </p>
        </div>

        <div className="space-y-5">
          {categories.map(cat => {
            const apps = SUPPORTED_CONNECTORS.filter(a => a.categories.includes(cat))
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {cat.replace(/-/g, ' ')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {apps.map(app => (
                    <button
                      key={app.key}
                      onClick={() => onSelect(app)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 transition-all text-left group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={app.logo} alt={app.displayName} className="size-8 rounded-lg shrink-0 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-tight">{app.displayName}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{app.actionsCount} actions</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100 text-muted-foreground transition-colors">
          <XCircle className="size-4" />
        </button>
      </motion.div>
    </div>
  )
}

// ─── Input fields modal (shown when app requires params before OAuth) ─────────

function InputFieldsModal({
  app,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  app: AppInfo
  onSubmit: (params: Record<string, string>) => void
  onBack: () => void
  submitting: boolean
  error: string | null
}) {
  const fields: AppInputField[] = app.inputFields ?? []
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f.name, '']))
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
      >
        <div className="flex items-center gap-3 mb-5">
          {app.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.logo} alt={app.displayName} className="size-9 rounded-xl object-contain" />
          )}
          <div>
            <h2 className="text-sm font-semibold">Connect {app.displayName}</h2>
            <p className="text-xs text-muted-foreground">Fill in the details below to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(field => (
            <div key={field.name}>
              <label className="text-xs font-medium block mb-1">
                {field.label}
                {field.required && <span className="text-rose-500 ml-0.5">*</span>}
              </label>
              <input
                type="text"
                value={values[field.name] ?? ''}
                onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{field.description}</p>
            </div>
          ))}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onBack}
              className="flex-1 h-9 text-xs rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
              Back
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-9 text-xs bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {submitting
                ? <><Loader2 className="size-3 animate-spin" />Connecting…</>
                : <>Continue <ExternalLink className="size-3" /></>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── OAuth pending modal ──────────────────────────────────────────────────────

function OAuthPendingModal({
  appName,
  redirectUrl,
  connectionId,
  workspaceId,
  onActivated,
  onClose,
}: {
  appName: string
  redirectUrl: string
  connectionId: string
  workspaceId: string
  onActivated: () => void
  onClose: () => void
}) {
  const [polling, setPolling] = useState(false)
  const [opened, setOpened] = useState(false)

  function openAuth() {
    window.open(redirectUrl, '_blank', 'width=600,height=700')
    setOpened(true)
    setPolling(true)
  }

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/connections/status?workspaceId=${workspaceId}&connectionId=${connectionId}`)
      const data = await res.json()
      if (data.status === 'active') {
        clearInterval(interval)
        setPolling(false)
        onActivated()
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [polling, connectionId, workspaceId, onActivated])

  const app = SUPPORTED_CONNECTORS.find(a => a.key === appName)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 text-center"
      >
        {app?.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.logo} alt={app.displayName} className="size-12 mx-auto rounded-xl mb-4 object-contain" />
        )}
        <h2 className="text-sm font-semibold mb-1">Connect {app?.displayName ?? appName}</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Complete the OAuth flow in the browser window that opens. This page will update automatically.
        </p>

        {!opened ? (
          <Button onClick={openAuth} className="w-full gap-2">
            <ExternalLink className="size-3.5" />
            Authorise {app?.displayName ?? appName}
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-full justify-center">
              {polling
                ? <><Loader2 className="size-3.5 animate-spin" /> Waiting for authorisation…</>
                : <><Clock className="size-3.5" /> Authorisation window opened</>
              }
            </div>
            <button onClick={openAuth} className="text-xs text-muted-foreground hover:text-foreground underline">
              Open window again
            </button>
          </div>
        )}

        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-zinc-100 text-muted-foreground">
          <XCircle className="size-4" />
        </button>
      </motion.div>
    </div>
  )
}

// ─── Connection card ──────────────────────────────────────────────────────────

function ConnectionCard({
  conn,
  onDisconnect,
  onSync,
  onSettings,
}: {
  conn: Connection
  onDisconnect: (id: string) => void
  onSync: (id: string) => void
  onSettings: (id: string) => void
}) {
  const s = STATUS[conn.status] ?? STATUS.disconnected
  const StatusIcon = s.icon
  const isSyncing = conn.sync_status === 'syncing'
  const app = SUPPORTED_CONNECTORS.find(a => a.key === conn.app_name)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {conn.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conn.logo_url} alt={conn.app_name} className="size-9 rounded-lg object-contain shrink-0 mt-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{conn.name}</span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-normal border', s.color)}>
              <StatusIcon className="size-3 mr-1" />
              {s.label}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {app?.displayName ?? conn.app_name}
            {conn.last_sync_at && ` · Last sync ${fmt(conn.last_sync_at)}`}
            {conn.last_sync_rows != null && ` · ${conn.last_sync_rows.toLocaleString()} rows`}
          </p>
          {isSyncing && conn.sync_total && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Syncing…</span>
                <span>{conn.sync_progress ?? 0} / {conn.sync_total}</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${Math.round(((conn.sync_progress ?? 0) / conn.sync_total) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {conn.sync_error && (
            <p className="text-[11px] text-rose-600 mt-1 truncate">{conn.sync_error}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {conn.status === 'active' && (
            <button
              onClick={() => onSync(conn.id)}
              disabled={isSyncing}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-foreground transition-colors disabled:opacity-40"
              title="Sync now"
            >
              <RefreshCcw className={cn('size-3.5', isSyncing && 'animate-spin')} />
            </button>
          )}
          <button
            onClick={() => onSettings(conn.id)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings2 className="size-3.5" />
          </button>
          <button
            onClick={() => onDisconnect(conn.id)}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
            title="Remove connection"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface Props {
  workspaceId: string
}

export function ConnectionsView({ workspaceId }: Props) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Show success banner if redirected back from OAuth callback
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('connection') === 'success') {
      const app = p.get('app') ?? 'data source'
      setSuccessBanner(`${app.charAt(0).toUpperCase() + app.slice(1)} connected successfully!`)
      // Clean the URL param without a page reload
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
    if (p.get('connection') === 'error') {
      setError('OAuth failed — please try connecting again.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])
  const [showPicker, setShowPicker] = useState(false)
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [settingsConnectionId, setSettingsConnectionId] = useState<string | null>(null)

  // OAuth pending state
  const [pendingAuth, setPendingAuth] = useState<{
    appName: string
    redirectUrl: string
    connectionId: string
  } | null>(null)

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch(`/api/connections/list?workspaceId=${workspaceId}`)
      if (!res.ok) throw new Error('Failed to load connections')
      const data = await res.json()
      setConnections(data.connections ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchConnections() }, [fetchConnections])

  // Poll while any connection is pending or syncing
  useEffect(() => {
    const needsPoll = connections.some(c => c.status === 'pending' || c.sync_status === 'syncing')
    if (!needsPoll) return
    const interval = setInterval(fetchConnections, 3000)
    return () => clearInterval(interval)
  }, [connections, fetchConnections])

  function handleAppSelected(app: AppInfo) {
    setShowPicker(false)
    setConnectError(null)
    // If app needs input fields, show that step first
    if (app.inputFields?.length) {
      setSelectedApp(app)
    } else {
      void handleConnect(app, {})
    }
  }

  async function handleConnect(app: AppInfo, params: Record<string, string>) {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await fetch('/api/connections/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, appName: app.key, params }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSelectedApp(null)
      await fetchConnections()

      if (data.redirectUrl) {
        setPendingAuth({
          appName: app.key,
          redirectUrl: data.redirectUrl,
          connectionId: data.connectionId,
        })
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect(id: string) {
    // Optimistic removal — remove from list immediately
    setConnections(prev => prev.filter(c => c.id !== id))
    await fetch('/api/connections/disconnect', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: id, workspaceId }),
    })
  }

  async function handleSync(id: string) {
    await fetch('/api/sync/snowflake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, connectionId: id }),
    })
    await fetchConnections()
  }

  const activeCount = connections.filter(c => c.status === 'active').length

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Connections"
        description="Connect your data sources via Composio. All OAuth and credential management is handled automatically."
      >
        <Button size="sm" className="gap-1.5" onClick={() => setShowPicker(true)} disabled={connecting}>
          {connecting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add connection
        </Button>
      </SectionHeader>

      {/* Stats strip */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className={cn('size-2 rounded-full', activeCount > 0 ? 'bg-emerald-500' : 'bg-zinc-300')} />
          <span className="text-muted-foreground">{activeCount} active connection{activeCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Zap className="size-3" />
          Powered by Composio · 500+ connectors
        </div>
      </div>

      {successBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          <PartyPopper className="size-4 shrink-0" />
          {successBanner}
          <button onClick={() => setSuccessBanner(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <XCircle className="size-4" />
          </button>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertCircle className="size-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <XCircle className="size-4" />
          </button>
        </div>
      )}

      {/* Connection list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-zinc-200">
          <div className="size-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Plus className="size-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium mb-1">No connections yet</p>
          <p className="text-xs text-muted-foreground mb-4">Connect Snowflake, Google Sheets, Airtable, and more</p>
          <Button size="sm" variant="outline" onClick={() => setShowPicker(true)}>
            Add your first connection
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {connections.map(conn => (
              <ConnectionCard
                key={conn.id}
                conn={conn}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
                onSettings={setSettingsConnectionId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showPicker && (
          <ConnectorPicker
            onSelect={handleAppSelected}
            onClose={() => setShowPicker(false)}
          />
        )}
        {selectedApp && (
          <InputFieldsModal
            app={selectedApp}
            onSubmit={(params) => handleConnect(selectedApp, params)}
            onBack={() => { setSelectedApp(null); setShowPicker(true) }}
            submitting={connecting}
            error={connectError}
          />
        )}
        {pendingAuth && (
          <OAuthPendingModal
            {...pendingAuth}
            workspaceId={workspaceId}
            onActivated={() => { setPendingAuth(null); fetchConnections() }}
            onClose={() => setPendingAuth(null)}
          />
        )}
        {settingsConnectionId && (
          <ConnectionSettingsPanel
            connectionId={settingsConnectionId}
            workspaceId={workspaceId}
            onClose={() => setSettingsConnectionId(null)}
            onSyncStarted={() => { fetchConnections() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
