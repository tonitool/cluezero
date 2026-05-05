'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, RefreshCcw, CheckCircle2, AlertCircle, Clock,
  Loader2, Save, Database, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { SUPPORTED_CONNECTORS } from '@/lib/connectors'

// ─── Types ────────────────────────────────────────────────────────────────────

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

const COLUMN_MAPPING_FIELDS = [
  { key: 'colBrand',       label: 'Brand',          required: true,  hint: 'Advertiser / brand name' },
  { key: 'colDate',        label: 'Date',            required: true,  hint: 'Row date or week start' },
  { key: 'colAdId',        label: 'Ad ID',           required: false, hint: 'Unique ad identifier' },
  { key: 'colHeadline',    label: 'Headline',        required: false, hint: 'Ad headline or title' },
  { key: 'colSpend',       label: 'Spend',           required: false, hint: 'Estimated spend' },
  { key: 'colImpressions', label: 'Impressions',     required: false, hint: 'Estimated impressions' },
  { key: 'colReach',       label: 'Reach',           required: false, hint: 'Estimated reach' },
  { key: 'colPi',          label: 'Performance Index', required: false, hint: 'Engagement score 0–100' },
  { key: 'colFunnel',      label: 'Funnel stage',    required: false, hint: 'TOFU / MOFU / BOFU' },
  { key: 'colTopic',       label: 'Topic',           required: false, hint: 'Ad topic or theme' },
  { key: 'colPlatform',    label: 'Platform',        required: false, hint: 'META / GOOGLE / etc.' },
  { key: 'colThumbnail',   label: 'Thumbnail URL',   required: false, hint: 'Ad creative image URL' },
  { key: 'colIsActive',    label: 'Is Active',       required: false, hint: 'Boolean — ad is running' },
] as const

type ColKey = typeof COLUMN_MAPPING_FIELDS[number]['key']
type Config = { database: string; schemaName: string; tableName: string } & Record<ColKey, string>

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({
  value, onChange, items, loading, disabled, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  items: string[]
  loading?: boolean
  disabled?: boolean
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || loading}
        className={cn(
          'w-full h-8 pl-2.5 pr-7 text-xs font-mono rounded-md border border-input bg-background',
          'appearance-none focus:outline-none focus:ring-1 focus:ring-ring',
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          !value && 'text-muted-foreground',
        )}
      >
        <option value="">{loading ? 'Loading…' : placeholder}</option>
        {items.map(item => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        {loading
          ? <Loader2 className="size-3 animate-spin text-muted-foreground" />
          : <ChevronDown className="size-3 text-muted-foreground" />
        }
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [cfg, setCfg] = useState<Config>({
    database: '', schemaName: '', tableName: '',
    colBrand: '', colDate: '', colAdId: '', colHeadline: '',
    colSpend: '', colImpressions: '', colReach: '', colPi: '',
    colFunnel: '', colTopic: '', colPlatform: '', colThumbnail: '', colIsActive: '',
  })

  // Snowflake metadata
  const [databases, setDatabases]   = useState<string[]>([])
  const [schemas, setSchemas]       = useState<string[]>([])
  const [tables, setTables]         = useState<string[]>([])
  const [columns, setColumns]       = useState<string[]>([])
  const [loadingDb, setLoadingDb]   = useState(false)
  const [loadingSc, setLoadingSc]   = useState(false)
  const [loadingTb, setLoadingTb]   = useState(false)
  const [loadingCo, setLoadingCo]   = useState(false)
  const [metaError, setMetaError]   = useState<string | null>(null)

  const meta = useCallback(async (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`/api/connections/${connectionId}/snowflake-meta?${qs}`)
    if (!res.ok) throw new Error((await res.json()).error)
    return (await res.json()).items as string[]
  }, [connectionId])

  const fetchConn = useCallback(async () => {
    try {
      const res = await fetch(`/api/connections/${connectionId}`)
      if (!res.ok) throw new Error('Failed to load connection')
      const { connection: c } = await res.json() as { connection: Connection }
      setConn(c)
      setName(c.name)
      const saved = c.config as Partial<Config>
      setCfg(prev => ({ ...prev, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => typeof v === 'string')) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => { fetchConn() }, [fetchConn])

  // Poll while syncing
  useEffect(() => {
    if (conn?.sync_status !== 'syncing') return
    const t = setInterval(fetchConn, 2500)
    return () => clearInterval(t)
  }, [conn?.sync_status, fetchConn])

  // Load databases once connection is active
  useEffect(() => {
    if (conn?.status !== 'active') return
    setLoadingDb(true)
    setMetaError(null)
    meta({ type: 'databases' })
      .then(items => { setDatabases(items); if (!items.length) setMetaError('No databases returned — check server logs') })
      .catch(err => setMetaError(err instanceof Error ? err.message : 'Failed to load databases'))
      .finally(() => setLoadingDb(false))
  }, [conn?.status, meta])

  // Load schemas when database changes
  useEffect(() => {
    if (!cfg.database) { setSchemas([]); setCfg(p => ({ ...p, schemaName: '', tableName: '' })); setColumns([]); return }
    setLoadingSc(true)
    meta({ type: 'schemas', database: cfg.database })
      .then(setSchemas)
      .catch(() => {})
      .finally(() => setLoadingSc(false))
  }, [cfg.database, meta])

  // Load tables when schema changes
  useEffect(() => {
    if (!cfg.database || !cfg.schemaName) { setTables([]); setCfg(p => ({ ...p, tableName: '' })); setColumns([]); return }
    setLoadingTb(true)
    meta({ type: 'tables', database: cfg.database, schema: cfg.schemaName })
      .then(setTables)
      .catch(() => {})
      .finally(() => setLoadingTb(false))
  }, [cfg.database, cfg.schemaName, meta])

  // Load columns when table changes
  useEffect(() => {
    if (!cfg.database || !cfg.schemaName || !cfg.tableName) { setColumns([]); return }
    setLoadingCo(true)
    meta({ type: 'columns', database: cfg.database, schema: cfg.schemaName, table: cfg.tableName })
      .then(setColumns)
      .catch(() => {})
      .finally(() => setLoadingCo(false))
  }, [cfg.database, cfg.schemaName, cfg.tableName, meta])

  function set(key: keyof Config, value: string) {
    setCfg(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaveSuccess(false)
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config: cfg }),
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
  const hasConfig = !!(cfg.database && cfg.schemaName && cfg.tableName && cfg.colBrand && cfg.colDate)

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
                  disabled={isSyncing || !hasConfig || conn?.status !== 'active'}
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

              {conn?.sync_error && (
                <p className="mt-2 text-[11px] text-rose-600 bg-rose-50 rounded px-2 py-1">{conn.sync_error}</p>
              )}
              {!hasConfig && conn?.status === 'active' && (
                <p className="mt-2 text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1">
                  ⚠ Select a table and map the required columns below before syncing.
                </p>
              )}
            </div>

            {/* Connection name */}
            <div className="px-5 pt-5 pb-4 border-b border-zinc-100">
              <Label className="text-xs">Connection name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1.5 h-8 text-sm"
                placeholder="My Snowflake"
              />
            </div>

            {/* Table picker */}
            <div className="px-5 pt-5 pb-5 border-b border-zinc-100">
              <div className="flex items-center gap-2 mb-4">
                <Database className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Source</p>
              </div>
              {metaError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 rounded px-2 py-1.5 mb-3">{metaError}</p>
              )}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Database <span className="text-rose-500">*</span></Label>
                  <Dropdown
                    value={cfg.database}
                    onChange={v => set('database', v)}
                    items={databases}
                    loading={loadingDb}
                    placeholder="Select database…"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Schema <span className="text-rose-500">*</span></Label>
                  <Dropdown
                    value={cfg.schemaName}
                    onChange={v => set('schemaName', v)}
                    items={schemas}
                    loading={loadingSc}
                    disabled={!cfg.database}
                    placeholder={cfg.database ? 'Select schema…' : 'Select database first'}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Table / View <span className="text-rose-500">*</span></Label>
                  <Dropdown
                    value={cfg.tableName}
                    onChange={v => set('tableName', v)}
                    items={tables}
                    loading={loadingTb}
                    disabled={!cfg.schemaName}
                    placeholder={cfg.schemaName ? 'Select table…' : 'Select schema first'}
                  />
                </div>
              </div>
            </div>

            {/* Column mapping */}
            <div className="px-5 pt-5 pb-8">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Column Mapping</p>
              </div>

              {!cfg.tableName ? (
                <p className="text-xs text-muted-foreground">Select a table above to map columns.</p>
              ) : (
                <div className="space-y-3">
                  {COLUMN_MAPPING_FIELDS.map((field, i) => (
                    <div key={field.key}>
                      {i === 2 && (
                        <div className="flex items-center gap-3 mb-3 pt-1">
                          <div className="h-px flex-1 bg-zinc-100" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Optional</span>
                          <div className="h-px flex-1 bg-zinc-100" />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs mb-1 block">
                          {field.label}
                          {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                          <span className="text-muted-foreground font-normal ml-1">— {field.hint}</span>
                        </Label>
                        <Dropdown
                          value={cfg[field.key]}
                          onChange={v => set(field.key, v)}
                          items={columns}
                          loading={loadingCo}
                          placeholder="Select column…"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
