'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCcw, Plus, Plug, Database } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { SnowflakeConnectSheet } from '@/components/dashboard/_components/snowflake-connect-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { connections as initialConnections } from '@/components/dashboard/mock-data'
import type { Connection } from '@/components/dashboard/mock-data'
import { cn } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  Meta:      '#1877F2',
  Google:    '#34A853',
  LinkedIn:  '#0A66C2',
  Manual:    '#6366F1',
  Snowflake: '#29B5E8',
}

const STATUS_CONFIG = {
  connected:    { icon: CheckCircle2, label: 'Connected',    className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  disconnected: { icon: XCircle,      label: 'Not connected', className: 'text-zinc-400 bg-zinc-50 border-zinc-200' },
  error:        { icon: AlertCircle,  label: 'Error',         className: 'text-rose-600 bg-rose-50 border-rose-200' },
  pending:      { icon: Clock,        label: 'Pending',       className: 'text-amber-600 bg-amber-50 border-amber-200' },
}

function formatSyncTime(iso: string | null): string {
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
}

const MOCK_DISCONNECTED_KEY = 'connections_disconnected'

function loadMockOverrides(): Set<string> {
  try {
    const raw = localStorage.getItem(MOCK_DISCONNECTED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

function saveMockOverrides(ids: Set<string>) {
  localStorage.setItem(MOCK_DISCONNECTED_KEY, JSON.stringify([...ids]))
}

interface Props { workspaceId?: string }

export function ConnectionsView({ workspaceId }: Props) {
  const [mockConnections, setMockConnections] = useState<Connection[]>(() => {
    const disconnected = loadMockOverrides()
    return initialConnections
      .filter(c => c.id !== 'snowflake')
      .map(c => disconnected.has(c.id) ? { ...c, status: 'disconnected' as const, lastSync: null, recordCount: null } : c)
  })
  const [sfConnections, setSfConnections] = useState<SnowflakeConn[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)

  function loadSfConnections() {
    if (!workspaceId) return
    fetch(`/api/snowflake/status?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.connections)) setSfConnections(d.connections) })
      .catch(() => {})
  }

  useEffect(() => { loadSfConnections() }, [workspaceId])

  function handleSync(connId: string) {
    if (!workspaceId) return
    setSyncing(connId)
    fetch('/api/sync/snowflake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, connectionId: connId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setSfConnections(prev => prev.map(c =>
            c.id === connId
              ? { ...c, lastSync: new Date().toISOString(), recordCount: d.inserted ?? 0, syncStatus: 'idle' }
              : c
          ))
        }
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

  function handleMockSync(id: string) {
    setSyncing(id)
    setTimeout(() => setSyncing(null), 2000)
  }

  function handleMockDisconnect(id: string) {
    const overrides = loadMockOverrides()
    overrides.add(id)
    saveMockOverrides(overrides)
    setMockConnections(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'disconnected' as const, lastSync: null, recordCount: null } : c
    ))
  }

  function handleMockReconnect(id: string) {
    const overrides = loadMockOverrides()
    overrides.delete(id)
    saveMockOverrides(overrides)
    setMockConnections(prev => prev.map(c =>
      c.id === id ? { ...initialConnections.find(i => i.id === id)! } : c
    ))
  }

  function handleSnowflakeConnected(connectionId: string, connectionName: string) {
    loadSfConnections()
    setEditingId(undefined)
  }

  function openAddSheet() {
    setEditingId(undefined)
    setSheetOpen(true)
  }

  function openEditSheet(connId: string) {
    setEditingId(connId)
    setSheetOpen(true)
  }

  const connectedCount = mockConnections.filter(c => c.status === 'connected').length + sfConnections.length
  const totalCount = mockConnections.length + sfConnections.length + 1 // +1 for "Add Snowflake" slot

  return (
    <div>
      <SnowflakeConnectSheet
        open={sheetOpen}
        onOpenChange={open => { setSheetOpen(open); if (!open) setEditingId(undefined) }}
        onConnected={handleSnowflakeConnected}
        workspaceId={workspaceId}
        editingConnectionId={editingId}
      />

      <SectionHeader
        title="Connections"
        description="Manage data source integrations and sync status"
      >
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openAddSheet}>
          <Plus className="size-3.5" />
          Add Snowflake Connection
        </Button>
      </SectionHeader>

      {/* Summary bar */}
      <div className="flex items-center gap-6 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium">{connectedCount} of {totalCount} sources active</span>
        </div>
      </div>

      {/* Snowflake connections */}
      {sfConnections.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Snowflake</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sfConnections.map(conn => {
              const isSyncing = syncing === conn.id
              const isDisconnecting = disconnecting === conn.id
              const hasError = conn.syncStatus === 'error'

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
                      hasError ? STATUS_CONFIG.error.className : STATUS_CONFIG.connected.className
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
                      <p className="text-xs font-medium mt-0.5">{formatSyncTime(conn.lastSync)}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Records</p>
                      <p className="text-xs font-medium mt-0.5">{conn.recordCount?.toLocaleString() ?? '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                      onClick={() => handleSync(conn.id)}
                      disabled={isSyncing || isDisconnecting}>
                      <RefreshCcw className={cn('size-3', isSyncing && 'animate-spin')} />
                      {isSyncing ? 'Syncing…' : 'Sync Now'}
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
              )
            })}

            {/* Add another connection tile */}
            <button
              onClick={openAddSheet}
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
            onClick={openAddSheet}
            className="w-full rounded-lg border-2 border-dashed border-border hover:border-[#29B5E8] hover:bg-[#29B5E8]/5 transition-colors p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[#29B5E8]"
          >
            <Plus className="size-6" />
            <span className="text-sm font-medium">Connect Snowflake</span>
            <span className="text-xs">Connect a table to start syncing data</span>
          </button>
        </div>
      )}

      {/* Other platform connections */}
      {mockConnections.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Other Sources</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockConnections.map(conn => {
              const status = STATUS_CONFIG[conn.status]
              const StatusIcon = status.icon
              const color = PLATFORM_COLORS[conn.platform] ?? '#888'
              const isSyncing = syncing === conn.id

              return (
                <div key={conn.id} className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}15`, border: `1.5px solid ${color}30` }}>
                        <Plug className="size-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{conn.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {conn.authType === 'oauth' ? 'OAuth 2.0' : conn.authType === 'api_key' ? 'API Key' : conn.authType === 'credentials' ? 'User / Password' : 'Manual Upload'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[11px] gap-1 font-medium shrink-0', status.className)}>
                      <StatusIcon className="size-3" />
                      {status.label}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{conn.description}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last sync</p>
                      <p className="text-xs font-medium mt-0.5">{formatSyncTime(conn.lastSync)}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Records</p>
                      <p className="text-xs font-medium mt-0.5">{conn.recordCount?.toLocaleString() ?? '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    {conn.status === 'connected' ? (
                      <>
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                          onClick={() => handleMockSync(conn.id)} disabled={isSyncing}>
                          <RefreshCcw className={cn('size-3', isSyncing && 'animate-spin')} />
                          {isSyncing ? 'Syncing…' : 'Sync Now'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 ml-auto"
                          onClick={() => handleMockDisconnect(conn.id)}>
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="h-7 gap-1.5 text-xs"
                        onClick={() => handleMockReconnect(conn.id)}>
                        <Plus className="size-3" /> Connect
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
