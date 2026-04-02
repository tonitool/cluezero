'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronRight, Loader2, XCircle, Database, Key } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── Snowflake SVG logo ───────────────────────────────────────────────────────

function SnowflakeLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="64" height="64" rx="12" fill="#29B5E8" />
      <path
        d="M32 8v48M32 8l-6 6m6-6l6 6M32 56l-6-6m6 6l6-6"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 32h48M8 32l6-6m-6 6l6 6M56 32l-6-6m6 6l-6 6"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.34 14.34l35.32 35.32m-35.32 0l35.32-35.32"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M14.34 14.34l-2 6.9m2-6.9l6.9-2M49.66 49.66l2-6.9m-2 6.9l-6.9 2M49.66 14.34l-6.9-2m6.9 2l2 6.9M14.34 49.66l6.9 2m-6.9-2l-2-6.9"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'credentials' | 'mapping' | 'success'

type Credentials = {
  connectionName: string
  account: string
  username: string
  password: string
  role: string
  warehouse: string
  database: string
  schema: string
  table: string
}

type Mapping = {
  brandCol: string
  dateCol: string
  headlineCol: string
  spendCol: string
  impressionsCol: string
  reachCol: string
  piCol: string
  funnelCol: string
  topicCol: string
}

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'credentials', label: 'Connect', icon: Key },
  { id: 'mapping',     label: 'Column Mapping', icon: Database },
]

// ─── Fuzzy column matching ────────────────────────────────────────────────────

function autoFillMapping(columns: string[], currentMapping: Mapping): Mapping {
  function find(keywords: string[]): string {
    for (const kw of keywords) {
      const match = columns.find(c => c.toLowerCase().includes(kw.toLowerCase()))
      if (match) return match
    }
    return ''
  }
  return {
    brandCol:       find(['brand', 'advertiser', 'company'])       || currentMapping.brandCol,
    dateCol:        find(['date', 'week', 'day', 'month'])         || currentMapping.dateCol,
    headlineCol:    find(['headline', 'creative', 'ad_name', 'title']) || currentMapping.headlineCol,
    spendCol:       find(['spend', 'cost', 'budget'])              || currentMapping.spendCol,
    impressionsCol: find(['impression', 'impr'])                   || currentMapping.impressionsCol,
    reachCol:       find(['reach', 'unique'])                      || currentMapping.reachCol,
    piCol:          find(['_pi', 'pi_', 'performance_index', 'perf_index', 'pi']) || currentMapping.piCol,
    funnelCol:      find(['funnel', 'stage', 'objective'])         || currentMapping.funnelCol,
    topicCol:       find(['topic', 'category', 'theme'])           || currentMapping.topicCol,
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected: (connectionId: string, connectionName: string) => void
  workspaceId?: string
  editingConnectionId?: string   // when set, editing an existing connection
}

export function SnowflakeConnectSheet({ open, onOpenChange, onConnected, workspaceId, editingConnectionId }: Props) {
  const [step, setStep] = useState<Step>('credentials')
  const [creds, setCreds] = useState<Credentials>({
    connectionName: '', account: '', username: '', password: '', role: '',
    warehouse: '', database: '', schema: '', table: '',
  })
  const [mapping, setMapping] = useState<Mapping>({
    brandCol: '', dateCol: '', headlineCol: '',
    spendCol: '', impressionsCol: '', reachCol: '',
    piCol: '', funnelCol: '', topicCol: '',
  })
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])

  function resetSheet() {
    setStep('credentials')
    setCreds({ connectionName: '', account: '', username: '', password: '', role: '', warehouse: '', database: '', schema: '', table: '' })
    setMapping({ brandCol: '', dateCol: '', headlineCol: '', spendCol: '', impressionsCol: '', reachCol: '', piCol: '', funnelCol: '', topicCol: '' })
    setDetecting(false)
    setDetectError(null)
    setSaving(false)
    setDetectedColumns([])
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetSheet()
    onOpenChange(v)
  }

  const credsValid =
    creds.connectionName.trim() &&
    creds.account.trim() &&
    creds.username.trim() &&
    creds.password.trim() &&
    creds.warehouse.trim() &&
    creds.database.trim() &&
    creds.schema.trim() &&
    creds.table.trim()

  const mappingValid = mapping.brandCol.trim() && mapping.dateCol.trim()

  // ── Detect columns ────────────────────────────────────────────────────────

  async function detectColumns() {
    setDetecting(true)
    setDetectError(null)
    try {
      const res = await fetch('/api/snowflake/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creds: {
            account:   creds.account,
            username:  creds.username,
            password:  creds.password,
            role:      creds.role || undefined,
            warehouse: creds.warehouse,
            database:  creds.database,
            schema:    creds.schema,
          },
          table: creds.table,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setDetectError(data.error ?? 'Connection failed')
      } else {
        const cols: string[] = data.columns ?? []
        setDetectedColumns(cols)
        setMapping(prev => autoFillMapping(cols, prev))
        setStep('mapping')
      }
    } catch {
      setDetectError('Network error — could not reach the server')
    } finally {
      setDetecting(false)
    }
  }

  // ── Save connection ───────────────────────────────────────────────────────

  async function saveConnection() {
    setSaving(true)
    try {
      if (workspaceId) {
        const res = await fetch('/api/snowflake/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            connectionId:   editingConnectionId,
            connectionName: creds.connectionName,
            creds: {
              account:   creds.account,
              username:  creds.username,
              password:  creds.password,
              role:      creds.role || undefined,
              warehouse: creds.warehouse,
              database:  creds.database,
              schema:    creds.schema,
            },
            mapping: {
              table:          creds.table,
              colBrand:       mapping.brandCol,
              colDate:        mapping.dateCol,
              colHeadline:    mapping.headlineCol    || undefined,
              colSpend:       mapping.spendCol       || undefined,
              colImpressions: mapping.impressionsCol || undefined,
              colReach:       mapping.reachCol       || undefined,
              colPi:          mapping.piCol          || undefined,
              colFunnel:      mapping.funnelCol      || undefined,
              colTopic:       mapping.topicCol       || undefined,
            },
          }),
        })
        const data = await res.json()
        setStep('success')
        onConnected(data.connectionId ?? editingConnectionId ?? '', creds.connectionName)
      }
    } finally {
      setSaving(false)
    }
  }

  const visibleStepIndex = STEPS.findIndex(s => s.id === step)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-y-auto p-0">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <SnowflakeLogo className="size-9 shrink-0" />
            <div>
              <SheetTitle className="text-base">Connect Snowflake</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Enter your credentials and table name — ClueZero detects columns automatically.
              </SheetDescription>
            </div>
          </div>

          {step !== 'success' && (
            <div className="flex items-center gap-1 mt-4">
              {STEPS.map((s, i) => {
                const done = visibleStepIndex > i
                const active = visibleStepIndex === i
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                        active && 'bg-[#29B5E8]/15 text-[#29B5E8]',
                        done  && 'bg-emerald-50 text-emerald-600',
                        !active && !done && 'text-muted-foreground'
                      )}
                    >
                      {done
                        ? <CheckCircle2 className="size-3" />
                        : <s.icon className="size-3" />
                      }
                      {s.label}
                    </div>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className="size-3 text-muted-foreground/50" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 px-6 py-5 overflow-y-auto">

          {/* ── Step 1: Connect ── */}
          {step === 'credentials' && (
            <div className="flex flex-col gap-5">
              <p className="text-xs text-muted-foreground">
                Enter your Snowflake account details and the table to read. Credentials are encrypted at rest.
              </p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sf-conn-name" className="text-xs">Connection name <span className="text-rose-500">*</span></Label>
                <Input
                  id="sf-conn-name"
                  placeholder="e.g. Germany, Poland, Q1 2026"
                  className="h-8 text-sm"
                  value={creds.connectionName}
                  onChange={e => setCreds(p => ({ ...p, connectionName: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">Used to identify this source in the dashboard filter.</p>
              </div>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Account</legend>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sf-account" className="text-xs">Account identifier <span className="text-rose-500">*</span></Label>
                  <Input
                    id="sf-account"
                    placeholder="xy12345.us-east-1"
                    className="h-8 text-sm font-mono"
                    value={creds.account}
                    onChange={e => setCreds(p => ({ ...p, account: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Found in Admin → Accounts in Snowsight</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sf-user" className="text-xs">Username <span className="text-rose-500">*</span></Label>
                    <Input
                      id="sf-user"
                      placeholder="svc_cluezero"
                      className="h-8 text-sm"
                      value={creds.username}
                      onChange={e => setCreds(p => ({ ...p, username: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sf-role" className="text-xs">Role <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="sf-role"
                      placeholder="ANALYST"
                      className="h-8 text-sm font-mono"
                      value={creds.role}
                      onChange={e => setCreds(p => ({ ...p, role: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sf-password" className="text-xs">Password <span className="text-rose-500">*</span></Label>
                  <Input
                    id="sf-password"
                    type="password"
                    placeholder="••••••••••••"
                    className="h-8 text-sm"
                    value={creds.password}
                    onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
                  />
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Warehouse & Storage</legend>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sf-warehouse" className="text-xs">Warehouse <span className="text-rose-500">*</span></Label>
                  <Input
                    id="sf-warehouse"
                    placeholder="COMPUTE_WH"
                    className="h-8 text-sm font-mono"
                    value={creds.warehouse}
                    onChange={e => setCreds(p => ({ ...p, warehouse: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sf-db" className="text-xs">Database <span className="text-rose-500">*</span></Label>
                    <Input
                      id="sf-db"
                      placeholder="MARKETING_DB"
                      className="h-8 text-sm font-mono"
                      value={creds.database}
                      onChange={e => setCreds(p => ({ ...p, database: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sf-schema" className="text-xs">Schema <span className="text-rose-500">*</span></Label>
                    <Input
                      id="sf-schema"
                      placeholder="PUBLIC"
                      className="h-8 text-sm font-mono"
                      value={creds.schema}
                      onChange={e => setCreds(p => ({ ...p, schema: e.target.value }))}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Source Table</legend>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sf-table" className="text-xs">Table name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="sf-table"
                    placeholder="AD_PERFORMANCE"
                    className="h-8 text-sm font-mono"
                    value={creds.table}
                    onChange={e => setCreds(p => ({ ...p, table: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Full path: {creds.database || 'DB'}.{creds.schema || 'SCHEMA'}.{creds.table || 'TABLE'}
                  </p>
                </div>
              </fieldset>

              {detectError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
                  <XCircle className="size-3.5 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-rose-600">{detectError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Column Mapping ── */}
          {step === 'mapping' && (
            <div className="flex flex-col gap-5">
              <p className="text-xs text-muted-foreground">
                Column names were detected automatically. Review and adjust any mismatches, then save.
              </p>

              <div className="flex items-center gap-2 bg-zinc-50 border border-border rounded-md px-3 py-2">
                <SnowflakeLogo className="size-4" />
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {creds.account} · {creds.database}.{creds.schema}.{creds.table}
                </span>
              </div>

              {detectedColumns.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Detected:</span>
                  {detectedColumns.map(col => (
                    <span key={col} className="text-[10px] font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{col}</span>
                  ))}
                </div>
              )}

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Column mapping</legend>
                <p className="text-[11px] text-muted-foreground -mt-2">Leave blank to skip optional fields.</p>

                {([
                  { id: 'brandCol',       label: 'Brand / advertiser',     placeholder: 'BRAND',       required: true  },
                  { id: 'dateCol',        label: 'Date / week start',       placeholder: 'DATE',        required: true  },
                  { id: 'headlineCol',    label: 'Ad headline / creative',  placeholder: 'HEADLINE',    required: false },
                  { id: 'spendCol',       label: 'Estimated spend (€)',     placeholder: 'SPEND',       required: false },
                  { id: 'impressionsCol', label: 'Impressions',             placeholder: 'IMPRESSIONS', required: false },
                  { id: 'reachCol',       label: 'Reach',                   placeholder: 'REACH',       required: false },
                  { id: 'piCol',          label: 'Performance index (PI)',   placeholder: 'PI',          required: false },
                  { id: 'funnelCol',      label: 'Funnel stage',            placeholder: 'FUNNEL',      required: false },
                  { id: 'topicCol',       label: 'Topic / category',        placeholder: 'TOPIC',       required: false },
                ] as { id: keyof Mapping; label: string; placeholder: string; required: boolean }[]).map(field => (
                  <div key={field.id} className="flex flex-col gap-1.5">
                    <Label htmlFor={`sf-${field.id}`} className="text-xs">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </Label>
                    <Input
                      id={`sf-${field.id}`}
                      placeholder={field.placeholder}
                      className="h-8 text-sm font-mono"
                      value={mapping[field.id]}
                      onChange={e => setMapping(p => ({ ...p, [field.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </fieldset>
            </div>
          )}

          {/* ── Success ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="size-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Snowflake connected</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Your warehouse is live. ClueZero will sync {creds.database}.{creds.schema}.{creds.table} on the next scheduled run.
                </p>
              </div>
              <div className="w-full bg-zinc-50 border border-border rounded-lg p-4 text-left flex flex-col gap-2">
                <SummaryRow label="Name" value={creds.connectionName} />
                <SummaryRow label="Account" value={creds.account} />
                <SummaryRow label="Table" value={`${creds.database}.${creds.schema}.${creds.table}`} />
                <SummaryRow label="Brand column" value={mapping.brandCol} />
                <SummaryRow label="Date column" value={mapping.dateCol} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {step !== 'success' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              disabled={detecting || saving}
              onClick={() => {
                if (step === 'credentials') handleOpenChange(false)
                else setStep('credentials')
              }}
            >
              {step === 'credentials' ? 'Cancel' : 'Back'}
            </Button>
          )}

          {step === 'credentials' && (
            <Button
              size="sm"
              className="text-xs h-8 ml-auto bg-[#29B5E8] hover:bg-[#1ea3d5] text-white"
              disabled={!credsValid || detecting}
              onClick={detectColumns}
            >
              {detecting ? (
                <><Loader2 className="size-3 mr-1.5 animate-spin" />Connecting…</>
              ) : (
                <>Detect columns <ChevronRight className="size-3 ml-1" /></>
              )}
            </Button>
          )}

          {step === 'mapping' && (
            <Button
              size="sm"
              className="text-xs h-8 ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!mappingValid || saving}
              onClick={saveConnection}
            >
              {saving ? (
                <><Loader2 className="size-3 mr-1.5 animate-spin" />Saving…</>
              ) : (
                <>Save connection <ChevronRight className="size-3 ml-1" /></>
              )}
            </Button>
          )}

          {step === 'success' && (
            <Button
              size="sm"
              className="text-xs h-8 w-full bg-[#29B5E8] hover:bg-[#1ea3d5] text-white"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          )}
        </div>

      </SheetContent>
    </Sheet>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[11px] font-mono font-medium text-right truncate">{value || '—'}</span>
    </div>
  )
}
