'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, RefreshCcw, CheckCircle2, AlertCircle, Clock,
  Loader2, Save, Database, Table2, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
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

// Column mapping fields — what data the sync engine needs
const COLUMN_FIELDS = [
  { key: 'tableName',      label: 'Table / View Name', placeholder: 'V_AD_LIBRARY_FINAL_WEEKLY', required: true,  hint: 'The Snowflake table or view to sync from' },
  { key: 'colBrand',       label: 'Brand column',       placeholder: 'BRAND_NAME',               required: true,  hint: 'Column containing the advertiser / brand name' },
  { key: 'colDate',        label: 'Date column',         placeholder: 'WEEK_START_DATE',          required: true,  hint: 'Date or week start for the row' },
  { key: 'colAdId',        label: 'Ad ID column',        placeholder: 'GLOBAL_AD_ID',             required: false, hint: 'Unique identifier for each ad' },
  { key: 'colHeadline',    label: 'Headline column',     placeholder: 'AD_HEADLINE',              required: false, hint: 'Ad headline or title text' },
  { key: 'colSpend',       label: 'Spend column',        placeholder: 'EST_SPEND_EUR',            required: false, hint: 'Estimated spend (any currency)' },
  { key: 'colImpressions', label: 'Impressions column',  placeholder: 'EST_IMPRESSIONS',          required: false, hint: 'Estimated impressions' },
  { key: 'colReach',       label: 'Reach column',        placeholder: 'EST_REACH',                required: false, hint: 'Estimated reach / unique users' },
  { key: 'colPi',          label: 'Performance Index',   placeholder: 'PERFORMANCE_INDEX',        required: false, hint: 'Engagement / performance score (0–100)' },
  { key: 'colFunnel',      label: 'Funnel stage column', placeholder: 'FUNNEL_STAGE',             required: false, hint: 'TOFU / MOFU / BOFU or see/think/do/care' },
  { key: 'colTopic',       label: 'Topic column',        placeholder: 'TOPIC',                    required: false, hint: 'Ad topic or creative theme' },
  { key: 'colPlatform',    label: 'Platform column',     placeholder: 'SOURCE_PLATFORM',          required: false, hint: 'META / GOOGLE / LINKEDIN etc.' },
  { key: 'colThumbnail',   label: 'Thumbnail URL column', placeholder: 'THUMBNAIL_URL',           required: false, hint: 'URL of the ad creative image' },
  { key: 'colIsActive',    label: 'Is Active column',    placeholder: 'IS_ACTIVE',                required: false, hint: 'Boolean — whether the ad is currently running' },
] as const

type ColKey = typeof COLUMN_FIELDS[number]['key']

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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

  // Local form state
  const [name, setName] = useState('')
  const [cols, setCols] = useState<Record<ColKey, string>>({} as Record<ColKey, string>)

  const fetchConn = useCallback(async () => {
    try {
      const res = await fetch(`/api/connections/${connectionId}`)
      if (!res.ok) throw new Error('Failed to load connection')
      const data = await res.json()
      const c: Connection = data.connection
      setConn(c)
      setName(c.name)
      // Hydrate column fields from saved config
      const saved = c.config as Record<string, string>
      const hydrated = {} as Record<ColKey, string>
      for (const f of COLUMN_FIELDS) {
        hydrated[f.key] = saved[f.key] ?? ''
      }
      setCols(hydrated)
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

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config: cols }),
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
    setSyncing(true)
    setError(null)
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
  const hasConfig = cols.tableName?.trim() && cols.colBrand?.trim() && cols.colDate?.trim()

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
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

            {/* Status + Sync bar */}
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

              {/* Progress bar */}
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
                  ⚠ Configure table and required columns below before syncing.
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

            {/* Column mapping */}
            <div className="px-5 pt-5 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Table & Column Mapping
                </p>
              </div>

              <div className="space-y-4">
                {COLUMN_FIELDS.map((field, i) => (
                  <div key={field.key}>
                    {/* Section divider before optional fields */}
                    {i === 3 && (
                      <div className="flex items-center gap-3 mb-4 pt-1">
                        <div className="h-px flex-1 bg-zinc-100" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Optional columns</span>
                        <div className="h-px flex-1 bg-zinc-100" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Label className="text-xs">
                          {field.label}
                          {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                        </Label>
                        {cols[field.key] && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-emerald-600 border-emerald-200 bg-emerald-50">
                            set
                          </Badge>
                        )}
                      </div>
                      <Input
                        value={cols[field.key] ?? ''}
                        onChange={e => setCols(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{field.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {!loading && (
          <div className="px-5 py-4 border-t border-zinc-100 shrink-0 bg-white">
            {error && (
              <p className="text-xs text-rose-600 mb-3">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 gap-1.5 text-xs"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <><Loader2 className="size-3 animate-spin" />Saving…</>
                  : saveSuccess
                  ? <><CheckCircle2 className="size-3" />Saved!</>
                  : <><Save className="size-3" />Save changes</>
                }
              </Button>
              <Button variant="outline" className="text-xs" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}
