'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCcw, Plus, Database, ExternalLink, Loader2 } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { SnowflakeConnectSheet } from '@/components/dashboard/_components/snowflake-connect-sheet'
import { AddConnectionSheet }    from '@/components/dashboard/_components/add-connection-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  active:       { icon: CheckCircle2, label: 'Connected',    className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  disconnected: { icon: XCircle,      label: 'Not connected', className: 'text-zinc-400 bg-zinc-50 border-zinc-200' },
  error:        { icon: AlertCircle,  label: 'Error',         className: 'text-rose-600 bg-rose-50 border-rose-200' },
  pending:      { icon: Clock,        label: 'Pending',       className: 'text-amber-600 bg-amber-50 border-amber-200' },
} as const

interface AdPlatformConnection {
  id: string
  platform: 'google_ads' | 'meta_ads'
  account_id: string
  account_name: string
  status: 'active' | 'error' | 'pending'
  error_message: string | null
  connected_at: string
  last_used_at: string | null
  token_expires_at: string | null
}


function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type SyncStatus = 'idle' | 'syncing' | 'error'

interface SnowflakeConn {
  id: string
  name: string
  tableName: string
  lastSync: string | null
  recordCount: number | null
  syncStatus: SyncStatus
  syncError: string | null
  syncProgress: number | null
  syncTotal: number | null
}

interface Props { workspaceId?: string }

export function ConnectionsView({ workspaceId }: Props) {
  const [sfConnections, setSfConnections]   = useState<SnowflakeConn[]>([])
  const [adConnections, setAdConnections]   = useState<AdPlatformConnection[]>([])
  const [syncing, setSyncing]               = useState<string | null>(null)
  const [disconnecting, setDisconnecting]   = useState<string | null>(null)
  const [addSheetOpen,  setAddSheetOpen]  = useState(false)
  const [sheetOpen,     setSheetOpen]     = useState(false)
  const [editingId,     setEditingId]     = useState<string | undefined>(undefined)
  const [adLoading, setAdLoading]           = useState(false)
  const [prodConns, setProdConns] = useState<{
    id: string; platform: string; account_name: string | null; config: Record<string, string | null>; status: string
  }[]>([])
  const [clickupToken, setClickupToken] = useState('')
  const [connectingClickUp, setConnectingClickUp] = useState(false)
  const [clickupError, setClickupError] = useState('')
  const [clickupLists, setClickupLists] = useState<{ id: string; name: string }[]>([])
  const [clickupListId, setClickupListId] = useState('')
  const [savingClickUp, setSavingClickUp] = useState(false)

  const loadSfConnections = useCallback(() => {
    if (!workspaceId) return
    fetch(`/api/snowflake/status?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.connections)) setSfConnections(d.connections) })
      .catch(() => {})
  }, [workspaceId])

  const loadAdConnections = useCallback(() => {
    if (!workspaceId) return
    setAdLoading(true)
    fetch(`/api/connections/list?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (d.connections) setAdConnections(d.connections)
        if (d.productivityConnections) setProdConns(d.productivityConnections)
      })
      .catch(() => {})
      .finally(() => setAdLoading(false))
  }, [workspaceId])

  useEffect(() => {
    loadSfConnections()
    loadAdConnections()
    // Check for OAuth redirect result
    const params = new URLSearchParams(window.location.search)
    if (params.get('connection_success') || params.get('connection_error')) {
      window.history.replaceState({}, '', window.location.pathname)
      loadAdConnections()
    }
  }, [loadSfConnections, loadAdConnections])

  // Poll sync_status while any connection is syncing
  useEffect(() => {
    const anySyncing = sfConnections.some(c => c.syncStatus === 'syncing')
    if (!anySyncing) return
    const interval = setInterval(loadSfConnections, 3000)
    return () => clearInterval(interval)
  }, [sfConnections, loadSfConnections])

  function handleSync(connId: string) {
    if (!workspaceId) return
    setSyncing(connId)
    // Mark local state as syncing immediately
    setSfConnections(prev => prev.map(c =>
      c.id === connId ? { ...c, syncStatus: 'syncing' as SyncStatus } : c
    ))
    fetch('/api/sync/snowflake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, connectionId: connId }),
    })
      .then(r => r.json())
      .then(d => {
        // Server returns { started: true } immediately — sync runs in background
        if (!d.started) {
          // Fallback: if something went wrong before background start, reset status
          setSfConnections(prev => prev.map(c =>
            c.id === connId ? { ...c, syncStatus: 'error' as SyncStatus } : c
          ))
        }
      })
      .catch(() => {
        setSfConnections(prev => prev.map(c =>
          c.id === connId ? { ...c, syncStatus: 'error' as SyncStatus } : c
        ))
      })
      .finally(() => setSyncing(null))
  }

  function handleDisconnectSf(connId: string) {
    if (!workspaceId) return
    setDisconnecting(connId)
    fetch('/api/snowflake/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, connectionId: connId }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setSfConnections(prev => prev.filter(c => c.id !== connId)) })
      .finally(() => setDisconnecting(null))
  }

  function handleDisconnectAd(connId: string) {
    if (!workspaceId) return
    setDisconnecting(connId)
    fetch('/api/connections/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, connectionId: connId }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setAdConnections(prev => prev.filter(c => c.id !== connId)) })
      .finally(() => setDisconnecting(null))
  }

  function handleConnectGoogle() {
    if (!workspaceId) return
    window.location.href = `/api/connections/google?workspaceId=${workspaceId}`
  }

  function handleConnectMeta() {
    if (!workspaceId) return
    window.location.href = `/api/connections/meta?workspaceId=${workspaceId}`
  }

  async function handleConnectClickUp() {
    if (!workspaceId || !clickupToken.trim()) return
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
    setClickupLists(data.lists ?? [])
    loadAdConnections()
  }

  async function handleSaveClickUpList() {
    if (!workspaceId || !clickupListId) return
    setSavingClickUp(true)
    const list = clickupLists.find(l => l.id === clickupListId)
    await fetch('/api/connections/clickup/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        teamId: '', teamName: '', spaceId: '', spaceName: '',
        listId: clickupListId,
        listName: list?.name ?? '',
      }),
    })
    setSavingClickUp(false)
    loadAdConnections()
  }

  function handleSnowflakeConnected() {
    loadSfConnections()
    setEditingId(undefined)
  }

  function openAddSheet() {
    setAddSheetOpen(true)
  }

  function openSnowflakeSheet() {
    setEditingId(undefined)
    setSheetOpen(true)
  }

  function openEditSheet(connId: string) {
    setEditingId(connId)
    setSheetOpen(true)
  }

  const connectedCount = sfConnections.length + adConnections.filter(c => c.status === 'active').length
  const totalCount = sfConnections.length + adConnections.length

  const googleConns = adConnections.filter(c => c.platform === 'google_ads')
  const metaConns   = adConnections.filter(c => c.platform === 'meta_ads')

  const asanaConn   = prodConns.find(c => c.platform === 'asana')
  const clickupConn = prodConns.find(c => c.platform === 'clickup')

  return (
    <div>
      <AddConnectionSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        workspaceId={workspaceId}
        onSelectSnowflake={openSnowflakeSheet}
        onConnected={loadAdConnections}
      />

      <SnowflakeConnectSheet
        open={sheetOpen}
        onOpenChange={open => { setSheetOpen(open); if (!open) setEditingId(undefined) }}
        onConnected={handleSnowflakeConnected}
        workspaceId={workspaceId}
        editingConnectionId={editingId}
      />

      <SectionHeader
        title="Connections"
        description="Connect data sources, ad platforms, and output tools"
      >
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openAddSheet}>
          <Plus className="size-3.5" />
          Add Connection
        </Button>
      </SectionHeader>

      {/* Summary bar */}
      <div className="flex items-center gap-6 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium">{connectedCount} of {totalCount} sources active</span>
        </div>
      </div>

      {/* Ad Platform connections */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Ad Platforms</p>

        {adLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="size-4 animate-spin" /> Loading connections…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Google Ads */}
            {googleConns.length > 0 ? googleConns.map(conn => {
              const cfg = STATUS_CONFIG[conn.status] ?? STATUS_CONFIG.active
              const StatusIcon = cfg.icon
              const isDisconnecting = disconnecting === conn.id
              return (
                <div key={conn.id} className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#34A85315', border: '1.5px solid #34A85330' }}>
                        <svg className="size-4" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Google Ads</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{conn.account_name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[11px] gap-1 font-medium shrink-0', cfg.className)}>
                      <StatusIcon className="size-3" /> {cfg.label}
                    </Badge>
                  </div>
                  {conn.error_message && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1.5">{conn.error_message}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Connected</p>
                      <p className="text-xs font-medium mt-0.5">{formatTime(conn.connected_at)}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Account ID</p>
                      <p className="text-xs font-medium mt-0.5 font-mono">{conn.account_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 ml-auto"
                      onClick={() => handleDisconnectAd(conn.id)} disabled={isDisconnecting}>
                      {isDisconnecting ? 'Removing…' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              )
            }) : (
              <div className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: '#34A85315', border: '1.5px solid #34A85330' }}>
                    <svg className="size-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Google Ads</p>
                    <p className="text-xs text-muted-foreground mt-0.5">OAuth 2.0 · Not connected</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Connect your Google Ads account so the Performance Marketing Agent can access live campaign data.</p>
                <Button size="sm" className="h-7 gap-1.5 text-xs w-fit" onClick={handleConnectGoogle}>
                  <ExternalLink className="size-3" /> Connect Google Ads
                </Button>
              </div>
            )}

            {/* Meta Ads */}
            {metaConns.length > 0 ? metaConns.map(conn => {
              const cfg = STATUS_CONFIG[conn.status] ?? STATUS_CONFIG.active
              const StatusIcon = cfg.icon
              const isDisconnecting = disconnecting === conn.id
              return (
                <div key={conn.id} className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#1877F215', border: '1.5px solid #1877F230' }}>
                        <svg className="size-4" viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Meta Ads</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{conn.account_name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[11px] gap-1 font-medium shrink-0', cfg.className)}>
                      <StatusIcon className="size-3" /> {cfg.label}
                    </Badge>
                  </div>
                  {conn.error_message && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1.5">{conn.error_message}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Connected</p>
                      <p className="text-xs font-medium mt-0.5">{formatTime(conn.connected_at)}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Account ID</p>
                      <p className="text-xs font-medium mt-0.5 font-mono">{conn.account_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 ml-auto"
                      onClick={() => handleDisconnectAd(conn.id)} disabled={isDisconnecting}>
                      {isDisconnecting ? 'Removing…' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              )
            }) : (
              <div className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: '#1877F215', border: '1.5px solid #1877F230' }}>
                    <svg className="size-4" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Meta Ads</p>
                    <p className="text-xs text-muted-foreground mt-0.5">OAuth 2.0 · Not connected</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Connect your Meta Business account to give the agent access to your Facebook and Instagram campaign data.</p>
                <Button size="sm" className="h-7 gap-1.5 text-xs w-fit" onClick={handleConnectMeta}>
                  <ExternalLink className="size-3" /> Connect Meta Ads
                </Button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Snowflake connections */}
      {sfConnections.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Snowflake</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sfConnections.map(conn => {
              const isSyncing = syncing === conn.id || conn.syncStatus === 'syncing'
              const isDisconnecting = disconnecting === conn.id
              const hasError = conn.syncStatus === 'error'
              const pct = conn.syncTotal != null && conn.syncTotal > 0
                ? Math.round(((conn.syncProgress ?? 0) / conn.syncTotal) * 100)
                : 0

              return (
                <div key={conn.id} className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#29B5E815', border: '1.5px solid #29B5E830' }}>
                        <Database className="size-4" style={{ color: '#29B5E8' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{conn.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[180px]">{conn.tableName}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[11px] gap-1 font-medium shrink-0',
                      hasError ? STATUS_CONFIG.error.className : STATUS_CONFIG.active.className
                    )}>
                      {hasError
                        ? <><AlertCircle className="size-3" /> Error</>
                        : <><CheckCircle2 className="size-3" /> Connected</>
                      }
                    </Badge>
                  </div>

                  {hasError && conn.syncError && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1.5">{conn.syncError}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last sync</p>
                      <p className="text-xs font-medium mt-0.5">{formatTime(conn.lastSync)}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Records</p>
                      <p className="text-xs font-medium mt-0.5">{conn.recordCount?.toLocaleString() ?? '—'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1 border-t border-border">
                    {isSyncing && conn.syncTotal != null && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Importing records…</span>
                          <span className="font-mono">{(conn.syncProgress ?? 0).toLocaleString()} / {conn.syncTotal.toLocaleString()}</span>
                        </div>
                        <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#29B5E8] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                        onClick={() => handleSync(conn.id)}
                        disabled={isSyncing || isDisconnecting}>
                        <RefreshCcw className={cn('size-3', isSyncing && 'animate-spin')} />
                        {isSyncing ? (conn.syncTotal == null ? 'Fetching…' : 'Syncing…') : 'Sync Now'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => openEditSheet(conn.id)}
                        disabled={isSyncing || isDisconnecting}>
                        Configure
                      </Button>
                      <Button variant="ghost" size="sm"
                        className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 ml-auto"
                        onClick={() => handleDisconnectSf(conn.id)}
                        disabled={isSyncing || isDisconnecting}>
                        {isDisconnecting ? 'Removing…' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              onClick={openSnowflakeSheet}
              className="rounded-lg border-2 border-dashed border-border hover:border-[#29B5E8] hover:bg-[#29B5E8]/5 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[#29B5E8] min-h-[160px]"
            >
              <Plus className="size-5" />
              <span className="text-xs font-medium">Add another table</span>
            </button>
          </div>
        </div>
      )}

      {sfConnections.length === 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Snowflake</p>
          <button
            onClick={openSnowflakeSheet}
            className="w-full rounded-lg border-2 border-dashed border-border hover:border-[#29B5E8] hover:bg-[#29B5E8]/5 transition-colors p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[#29B5E8]"
          >
            <Plus className="size-6" />
            <span className="text-sm font-medium">Connect Snowflake</span>
            <span className="text-xs">Connect a table to start syncing data</span>
          </button>
        </div>
      )}

      {/* Output Integrations */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 px-1">Output Integrations</p>
        <p className="text-xs text-muted-foreground mb-3 px-1">When the Watch Agent finds high-priority changes, it creates tasks in your project tool automatically.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Asana */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F06A6A15', border: '1.5px solid #F06A6A30' }}>
                  <svg className="size-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="6.5" r="4.5" fill="#F06A6A"/>
                    <circle cx="5.5" cy="16.5" r="4.5" fill="#FFB3A7"/>
                    <circle cx="18.5" cy="16.5" r="4.5" fill="#E8384F"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Asana</p>
                  <p className="text-xs text-muted-foreground mt-0.5">OAuth 2.0</p>
                </div>
              </div>
              {asanaConn ? (
                <Badge variant="outline" className="text-[11px] gap-1 font-medium text-emerald-600 bg-emerald-50 border-emerald-200 shrink-0">
                  <CheckCircle2 className="size-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] gap-1 font-medium text-zinc-400 bg-zinc-50 border-zinc-200 shrink-0">
                  Not connected
                </Badge>
              )}
            </div>
            {asanaConn ? (
              <div className="bg-zinc-50 rounded-md px-3 py-2 text-xs">
                <p className="text-muted-foreground">Account: <span className="font-medium text-foreground">{asanaConn.account_name ?? 'Asana'}</span></p>
                {asanaConn.config?.project_name && (
                  <p className="text-muted-foreground mt-0.5">Project: <span className="font-medium text-foreground">{asanaConn.config.project_name}</span></p>
                )}
                {!asanaConn.config?.project_name && (
                  <p className="text-amber-600 mt-0.5">⚠ No project selected — go to Agent Hub → Settings to pick one</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Connect Asana so the Watch Agent can create tasks for high-priority competitive changes.</p>
                <Button size="sm" className="h-7 gap-1.5 text-xs w-fit" onClick={() => { if (workspaceId) window.location.href = `/api/connections/asana?workspaceId=${workspaceId}` }}>
                  <ExternalLink className="size-3" /> Connect Asana
                </Button>
              </>
            )}
          </div>

          {/* ClickUp */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#7B68EE15', border: '1.5px solid #7B68EE30' }}>
                  <svg className="size-5" viewBox="0 0 24 24" fill="none">
                    <path d="M3 14.5L7.5 10l3 3 4-5 6 6" stroke="#7B68EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">ClickUp</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Personal API token</p>
                </div>
              </div>
              {clickupConn ? (
                <Badge variant="outline" className="text-[11px] gap-1 font-medium text-emerald-600 bg-emerald-50 border-emerald-200 shrink-0">
                  <CheckCircle2 className="size-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] gap-1 font-medium text-zinc-400 bg-zinc-50 border-zinc-200 shrink-0">
                  Not connected
                </Badge>
              )}
            </div>
            {clickupConn ? (
              <div className="bg-zinc-50 rounded-md px-3 py-2 text-xs">
                <p className="text-muted-foreground">Account: <span className="font-medium text-foreground">{clickupConn.account_name ?? 'ClickUp'}</span></p>
                {clickupConn.config?.list_name && (
                  <p className="text-muted-foreground mt-0.5">List: <span className="font-medium text-foreground">{clickupConn.config.list_name}</span></p>
                )}
                {!clickupConn.config?.list_name && clickupLists.length === 0 && (
                  <p className="text-amber-600 mt-0.5">⚠ No list selected — go to Agent Hub → Settings to pick one</p>
                )}
                {clickupLists.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <select
                      value={clickupListId}
                      onChange={e => setClickupListId(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-border px-2 bg-white focus:outline-none"
                    >
                      <option value="">— pick a list —</option>
                      {clickupLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <Button size="sm" className="h-7 text-[11px] gap-1" onClick={handleSaveClickUpList} disabled={!clickupListId || savingClickUp}>
                      {savingClickUp ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                      Save list
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Paste your ClickUp personal API token to connect.</p>
                <input
                  value={clickupToken}
                  onChange={e => setClickupToken(e.target.value)}
                  placeholder="pk_xxxxxxxx…"
                  className="w-full h-8 text-xs rounded-md border border-border px-3 bg-white focus:outline-none font-mono"
                />
                {clickupError && <p className="text-[11px] text-rose-600">{clickupError}</p>}
                <div className="flex items-center justify-between">
                  <a href="https://app.clickup.com/settings/apps" target="_blank" rel="noopener" className="text-[11px] text-muted-foreground underline">
                    Get your token ↗
                  </a>
                  <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleConnectClickUp} disabled={!clickupToken.trim() || connectingClickUp}>
                    {connectingClickUp ? <Loader2 className="size-3 animate-spin" /> : null}
                    Connect
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
