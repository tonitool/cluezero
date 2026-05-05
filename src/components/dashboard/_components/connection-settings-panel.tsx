'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, RefreshCcw, CheckCircle2, AlertCircle, Clock, Loader2, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { SUPPORTED_CONNECTORS } from '@/lib/connectors'

interface Connection {
  id: string
  name: string
  app_name: string
  logo_url: string | null
  status: 'active' | 'pending' | 'error' | 'disconnected'
  last_sync_at: string | null
  last_sync_rows: number | null
  sync_status: string
  sync_progress: number | null
  sync_total: number | null
  sync_error: string | null
  config: Record<string, unknown>
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  connectionId: string
  workspaceId: string
  onClose: () => void
  onSyncStarted: () => void
}

export function ConnectionSettingsPanel({ connectionId, workspaceId, onClose, onSyncStarted }: Props) {
  const [conn, setConn] = useState<Connection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [name, setName] = useState('')
  const [database, setDatabase] = useState('')
  const [schemaName, setSchemaName] = useState('')
  const [tableName, setTableName] = useState('')

  const fetchConn = useCallback(async () => {
    try {
      const res = await fetch(`/api/connections/${connectionId}`)
      if (!res.ok) throw new Error('Failed to load connection')
      const { connection: c } = await res.json() as { connection: Connection }
      setConn(c)
      setName(c.name)
      const cfg = (c.config ?? {}) as Record<string, string>
      setDatabase(cfg.database ?? '')
      setSchemaName(cfg.schemaName ?? '')
      setTableName(cfg.tableName ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => { fetchConn() }, [fetchConn])

  useEffect(() => {
    if (conn?.sync_status !== 'syncing') return
    const t = setInterval(fetchConn, 2500)
    return () => clearInterval(t)
  }, [conn?.sync_status, fetchConn])

  async function handleSave() {
    setSaving(true); setError(null); setSaveSuccess(false)
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config: { database, schemaName, tableName } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchConn()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true); setError(null)
    try {
      const res = await fetch('/api/sync/snowflake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, connectionId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Sync failed')
      onSyncStarted()
      await fetchConn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const app = conn ? SUPPORTED_CONNECTORS.find(a => a.key === conn.app_name) : null
  const isSyncing = conn?.sync_status === 'syncing' || syncing

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 shrink-0">
          {conn?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conn.logo_url as string} alt="" className="size-8 rounded-lg object-contain" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{conn?.name ?? 'Connection'}</p>
            <p className="text-xs text-muted-foreground capitalize">{app?.displayName ?? conn?.app_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-muted-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Status + Sync */}
            <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {conn?.status === 'active'
                      ? <CheckCircle2 className="size-3.5 text-emerald-500" />
                      : conn?.status === 'error'
                      ? <AlertCircle className="size-3.5 text-rose-500" />
                      : <Clock className="size-3.5 text-amber-500" />
                    }
                    <span className="text-xs font-medium capitalize">{conn?.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {conn?.last_sync_at
                      ? `Last synced ${fmt(conn.last_sync_at)} · ${conn.last_sync_rows?.toLocaleString() ?? 0} rows`
                      : 'Never synced'
                    }
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={handleSync}
                  disabled={isSyncing || conn?.status !== 'active' || !database || !tableName}
                >
                  <RefreshCcw className={cn('size-3.5', isSyncing && 'animate-spin')} />
                  {isSyncing ? 'Syncing…' : 'Sync now'}
                </Button>
              </div>

              {isSyncing && conn?.sync_total && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Syncing rows…</span>
                    <span>{(conn.sync_progress ?? 0).toLocaleString()} / {conn.sync_total.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500 rounded-full"
                      animate={{ width: `${Math.round(((conn.sync_progress ?? 0) / conn.sync_total) * 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {conn?.sync_error && !isSyncing && (
                <p className="mt-2 text-[11px] text-rose-600 bg-rose-50 rounded px-2 py-1">{conn.sync_error}</p>
              )}
              {isSyncing && conn?.sync_error && (
                <p className="mt-2 text-[11px] text-indigo-600 bg-indigo-50 rounded px-2 py-1">{conn.sync_error}</p>
              )}
            </div>

            {/* Connection name */}
            <div className="px-5 pt-5 pb-4 border-b border-zinc-100">
              <Label className="text-xs">Connection name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="My Snowflake" />
            </div>

            {/* Table location */}
            <div className="px-5 pt-5 pb-8 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Table</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px]">Database</Label>
                  <Input value={database} onChange={e => setDatabase(e.target.value)} className="mt-1 h-7 text-xs font-mono" placeholder="MY_DB" />
                </div>
                <div>
                  <Label className="text-[11px]">Schema</Label>
                  <Input value={schemaName} onChange={e => setSchemaName(e.target.value)} className="mt-1 h-7 text-xs font-mono" placeholder="PUBLIC" />
                </div>
                <div>
                  <Label className="text-[11px]">Table / View</Label>
                  <Input value={tableName} onChange={e => setTableName(e.target.value)} className="mt-1 h-7 text-xs font-mono" placeholder="AD_LIBRARY" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-5 py-4 border-t border-zinc-100 shrink-0 bg-white">
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <div className="flex items-center gap-2">
              <Button className="flex-1 gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 className="size-3 animate-spin" />Saving…</>
                  : saveSuccess
                  ? <><CheckCircle2 className="size-3" />Saved!</>
                  : <><Save className="size-3" />Save changes</>
                }
              </Button>
              <Button variant="outline" className="text-xs" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}
