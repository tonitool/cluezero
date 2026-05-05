'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, RefreshCcw, CheckCircle2, AlertCircle, Clock,
  Loader2, Save, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { SUPPORTED_CONNECTORS } from '@/lib/connectors'

interface Connection {
  id: string
  name: string
  app_name: string
  logo_url: string | null
  status: 'active' | 'pending' | 'error' | 'disconnected'
  composio_connection_id: string | null
  last_sync_at: string | null
  last_sync_rows: number | null
  sync_status: string
  sync_progress: number | null
  sync_total: number | null
  sync_error: string | null
  config: Record<string, unknown>
  created_at: string
}

const OPTIONAL_COLS: { key: string; label: string }[] = [
  { key: 'colAdId',        label: 'Ad ID' },
  { key: 'colHeadline',    label: 'Headline' },
  { key: 'colSpend',       label: 'Spend' },
  { key: 'colImpressions', label: 'Impressions' },
  { key: 'colReach',       label: 'Reach' },
  { key: 'colPi',          label: 'Performance Index' },
  { key: 'colFunnel',      label: 'Funnel' },
  { key: 'colTopic',       label: 'Topic' },
  { key: 'colPlatform',    label: 'Platform' },
  { key: 'colThumbnail',   label: 'Thumbnail URL' },
  { key: 'colIsActive',    label: 'Is Active' },
  { key: 'colFormat',      label: 'Format' },
]

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ColSelect({
  label, required, value, onChange, columns,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  columns: string[]
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-[11px] w-40 shrink-0 text-right text-muted-foreground">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      <Select value={value || '__none__'} onValueChange={v => onChange(v === '__none__' ? '' : v)}>
        <SelectTrigger className="h-7 text-xs font-mono flex-1">
          <SelectValue placeholder="— pick column —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs text-muted-foreground">— none —</SelectItem>
          {columns.map(c => (
            <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
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
  const [colBrand, setColBrand] = useState('')
  const [colDate, setColDate] = useState('')
  const [optCols, setOptCols] = useState<Record<string, string>>({})

  const [columns, setColumns] = useState<string[]>([])
  const [loadingCols, setLoadingCols] = useState(false)
  const [colsError, setColsError] = useState<string | null>(null)

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
      setColBrand(cfg.colBrand ?? '')
      setColDate(cfg.colDate ?? '')
      const opt: Record<string, string> = {}
      for (const { key } of OPTIONAL_COLS) opt[key] = cfg[key] ?? ''
      setOptCols(opt)
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

  async function handleLoadColumns() {
    setLoadingCols(true); setColsError(null)
    try {
      // Save table location first so the API can use it
      await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...((conn?.config ?? {}) as object), database, schemaName, tableName } }),
      })
      const res = await fetch(`/api/connections/${connectionId}/columns`)
      const json = await res.json() as { columns?: string[]; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to load columns')
      setColumns(json.columns ?? [])
    } catch (err) {
      setColsError(err instanceof Error ? err.message : 'Failed to load columns')
    } finally {
      setLoadingCols(false)
    }
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaveSuccess(false)
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          config: { database, schemaName, tableName, colBrand, colDate, ...optCols },
        }),
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
  const hasMapping = !!(colBrand && colDate)
  const hasTable = !!(database && tableName)

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
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 shrink-0">
          {conn?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conn.logo_url} alt="" className="size-8 rounded-lg object-contain" />
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
                  disabled={isSyncing || conn?.status !== 'active' || !hasMapping}
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
            <div className="px-5 pt-5 pb-5 border-b border-zinc-100 space-y-3">
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
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs w-full"
                onClick={handleLoadColumns}
                disabled={loadingCols || !hasTable}
              >
                {loadingCols
                  ? <><Loader2 className="size-3 animate-spin" />Loading columns…</>
                  : <><Search className="size-3" />Load columns from Snowflake</>
                }
              </Button>
              {colsError && <p className="text-[11px] text-rose-600">{colsError}</p>}
            </div>

            {/* Column mapping — shown once columns are loaded */}
            {columns.length > 0 && (
              <div className="px-5 pt-5 pb-8 space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Column mapping</p>

                <ColSelect label="Brand" required value={colBrand} onChange={setColBrand} columns={columns} />
                <ColSelect label="Date" required value={colDate} onChange={setColDate} columns={columns} />

                {OPTIONAL_COLS.map(({ key, label }) => (
                  <ColSelect
                    key={key}
                    label={label}
                    value={optCols[key] ?? ''}
                    onChange={v => setOptCols(prev => ({ ...prev, [key]: v }))}
                    columns={columns}
                  />
                ))}

                <p className="text-[11px] text-muted-foreground pt-1">
                  <span className="text-rose-500">*</span> Brand and Date are required to sync.
                </p>
              </div>
            )}

            {/* Existing mapping (when columns not yet loaded but already saved) */}
            {columns.length === 0 && hasMapping && (
              <div className="px-5 pt-5 pb-8">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Current mapping</p>
                <div className="rounded-lg border border-zinc-100 divide-y divide-zinc-100 overflow-hidden">
                  {[
                    { label: 'Brand', value: colBrand },
                    { label: 'Date',  value: colDate },
                    ...OPTIONAL_COLS.filter(({ key }) => optCols[key]).map(({ key, label }) => ({ label, value: optCols[key] })),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-1.5 bg-white">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className="text-[11px] font-mono text-zinc-700">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">Click &ldquo;Load columns&rdquo; above to edit the mapping.</p>
              </div>
            )}
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
