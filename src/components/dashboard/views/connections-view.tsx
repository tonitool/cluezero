'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCcw, Plus, Plug } from 'lucide-react'
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

interface Props {
  workspaceId?: string
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

export function ConnectionsView({ workspaceId }: Props) {
  const [connections, setConnections] = useState<Connection[]>(() => {
    const disconnected = loadMockOverrides()
    return initialConnections.map(c =>
      disconnected.has(c.id) ? { ...c, status: 'disconnected' as const, lastSync: null, recordCount: null } : c
    )
  })
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [snowflakeSheetOpen, setSnowflakeSheetOpen] = useState(false)

  // Load real Snowflake connection status on mount
  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/snowflake/status?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setConnections(prev => prev.map(c =>
            c.id === 'snowflake'
              ? { ...c, status: 'connected', lastSync: d.lastSync, recordCount: d.recordCount ?? 0 }
              : c
          ))
        }
      })
      .catch(() => {})
  }, [workspaceId])

  function handleSync(id: string) {
    if (id === 'snowflake' && workspaceId) {
      setSyncing(id)
      fetch('/api/sync/snowflake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            setConnections(prev => prev.map(c =>
              c.id === 'snowflake'
                ? { ...c, lastSync: new Date().toISOString(), recordCount: d.inserted ?? 0 }
                : c
            ))
          }
        })
        .finally(() => setSyncing(null))
      return
    }
    setSyncing(id)
    setTimeout(() => setSyncing(null), 2000)
  }

  function handleConfigure(id: string) {
    if (id === 'snowflake') {
      setSnowflakeSheetOpen(true)
    }
    // Other connections: no-op for now
  }

  function handleDisconnect(id: string) {
    if (id === 'snowflake' && workspaceId) {
      setDisconnecting(id)
      fetch('/api/snowflake/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            setConnections(prev => prev.map(c =>
              c.id === 'snowflake'
                ? { ...c, status: 'disconnected', lastSync: null, recordCount: null }
                : c
            ))
          }
        })
        .finally(() => setDisconnecting(null))
      return
    }
    // For mock connections persist to localStorage so it survives refresh
    const overrides = loadMockOverrides()
    overrides.add(id)
    saveMockOverrides(overrides)
    setConnections(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'disconnected' as const, lastSync: null, recordCount: null } : c
    ))
  }

  function handleSnowflakeConnected() {
    setConnections(prev =>
      prev.map(c =>
        c.id === 'snowflake'
          ? { ...c, status: 'connected', lastSync: new Date().toISOString(), recordCount: 0 }
          : c
      )
    )
  }

  const connected = connections.filter(c => c.status === 'connected').length
  const total = connections.length

  return (
    <div>
      <SnowflakeConnectSheet
        open={snowflakeSheetOpen}
        onOpenChange={setSnowflakeSheetOpen}
        onConnected={handleSnowflakeConnected}
        workspaceId={workspaceId}
      />

      <SectionHeader
        title="Connections"
        description="Manage data source integrations and sync status"
      >
        <Button size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          Add Connection
        </Button>
      </SectionHeader>

      {/* Summary bar */}
      <div className="flex items-center gap-6 bg-white border border-border rounded-lg px-5 py-3 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium">{connected} of {total} sources active</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Last full sync: today at 08:14</span>
        <div className="ml-auto">
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <RefreshCcw className="size-3" />
            Sync All
          </Button>
        </div>
      </div>

      {/* Connection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn) => {
          const status = STATUS_CONFIG[conn.status]
          const StatusIcon = status.icon
          const color = PLATFORM_COLORS[conn.platform] ?? '#888'
          const isSyncing = syncing === conn.id
          const isDisconnecting = disconnecting === conn.id

          return (
            <div
              key={conn.id}
              className="bg-white rounded-lg border border-border shadow-sm p-5 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}15`, border: `1.5px solid ${color}30` }}
                  >
                    <Plug className="size-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{conn.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {conn.authType === 'oauth'        ? 'OAuth 2.0'
                      : conn.authType === 'api_key'     ? 'API Key'
                      : conn.authType === 'credentials' ? 'User / Password'
                      : 'Manual Upload'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-[11px] gap-1 font-medium shrink-0', status.className)}
                >
                  <StatusIcon className="size-3" />
                  {status.label}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {conn.description}
              </p>

              {/* Stats row */}
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

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                {conn.status === 'connected' || conn.status === 'error' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => handleSync(conn.id)}
                      disabled={isSyncing || isDisconnecting}
                    >
                      <RefreshCcw className={cn('size-3', isSyncing && 'animate-spin')} />
                      {isSyncing ? 'Syncing…' : 'Sync Now'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleConfigure(conn.id)}
                      disabled={isDisconnecting}
                    >
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 ml-auto"
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={isSyncing || isDisconnecting}
                    >
                      {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </Button>
                  </>
                ) : conn.status === 'disconnected' ? (
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => {
                      if (conn.id === 'snowflake') {
                        setSnowflakeSheetOpen(true)
                      } else {
                        // Clear the persisted override so it shows connected again
                        const overrides = loadMockOverrides()
                        overrides.delete(conn.id)
                        saveMockOverrides(overrides)
                        setConnections(prev => prev.map(c =>
                          c.id === conn.id
                            ? { ...initialConnections.find(i => i.id === conn.id)! }
                            : c
                        ))
                      }
                    }}
                  >
                    <Plus className="size-3" />
                    Connect
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-7 text-xs">Check Status</Button>
                )}
                {conn.status === 'error' && (
                  <span className="text-xs text-rose-600 ml-auto">Auth token expired — reconnect required</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
