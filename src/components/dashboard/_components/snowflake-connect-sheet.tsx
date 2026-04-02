'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronRight, Loader2, XCircle, Database, Table2, Key } from 'lucide-react'
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

type Step = 'credentials' | 'mapping' | 'test' | 'success'

type Credentials = {
  account: string
  username: string
  password: string
  role: string
  warehouse: string
  database: string
  schema: string
}

type Mapping = {
  table: string
  brandCol: string
  headlineCol: string
  spendCol: string
  impressionsCol: string
  dateCol: string
}

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'credentials', label: 'Credentials', icon: Key },
  { id: 'mapping',     label: 'Table Mapping', icon: Table2 },
  { id: 'test',        label: 'Test & Connect', icon: Database },
]

const STEP_ORDER: Step[] = ['credentials', 'mapping', 'test', 'success']

// ─── Test checks ─────────────────────────────────────────────────────────────

const TEST_CHECKS = [
  'Resolving account identifier…',
  'Authenticating user credentials…',
  'Connecting to warehouse…',
  'Verifying database & schema access…',
  'Validating table mapping…',
  'Running sample query (LIMIT 5)…',
]

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected: () => void
}

export function SnowflakeConnectSheet({ open, onOpenChange, onConnected }: Props) {
  const [step, setStep] = useState<Step>('credentials')
  const [creds, setCreds] = useState<Credentials>({
    account: '', username: '', password: '', role: '', warehouse: '', database: '', schema: '',
  })
  const [mapping, setMapping] = useState<Mapping>({
    table: '', brandCol: 'brand_name', headlineCol: 'ad_headline',
    spendCol: 'est_spend_eur', impressionsCol: 'impressions', dateCol: 'week_start',
  })
  const [testChecks, setTestChecks] = useState<'idle' | 'running' | 'done' | 'failed'>('idle')
  const [completedChecks, setCompletedChecks] = useState<number>(0)
  const [testError, setTestError] = useState<string | null>(null)

  function resetSheet() {
    setStep('credentials')
    setCreds({ account: '', username: '', password: '', role: '', warehouse: '', database: '', schema: '' })
    setMapping({ table: '', brandCol: 'brand_name', headlineCol: 'ad_headline', spendCol: 'est_spend_eur', impressionsCol: 'impressions', dateCol: 'week_start' })
    setTestChecks('idle')
    setCompletedChecks(0)
    setTestError(null)
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetSheet()
    onOpenChange(v)
  }

  // ── Credentials step ──────────────────────────────────────────────────────

  const credsValid =
    creds.account.trim() &&
    creds.username.trim() &&
    creds.password.trim() &&
    creds.warehouse.trim() &&
    creds.database.trim() &&
    creds.schema.trim()

  // ── Mapping step ──────────────────────────────────────────────────────────

  const mappingValid = mapping.table.trim() && mapping.brandCol.trim() && mapping.dateCol.trim()

  // ── Test step ─────────────────────────────────────────────────────────────

  function runTest() {
    setTestChecks('running')
    setCompletedChecks(0)
    setTestError(null)

    let i = 0
    const interval = setInterval(() => {
      i++
      setCompletedChecks(i)

      if (i === TEST_CHECKS.length) {
        clearInterval(interval)
        // Simulate success (always succeeds in mock)
        setTimeout(() => {
          setTestChecks('done')
        }, 400)
      }
    }, 480)
  }

  function handleFinish() {
    onConnected()
    handleOpenChange(false)
  }

  // ── Step index ────────────────────────────────────────────────────────────

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
                Query your data warehouse and map tables to competitive intelligence fields.
              </SheetDescription>
            </div>
          </div>

          {/* Step indicator */}
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

          {/* ── Step 1: Credentials ── */}
          {step === 'credentials' && (
            <div className="flex flex-col gap-5">
              <p className="text-xs text-muted-foreground">
                Enter your Snowflake account details. Credentials are encrypted at rest and never stored in plain text.
              </p>

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
            </div>
          )}

          {/* ── Step 2: Table Mapping ── */}
          {step === 'mapping' && (
            <div className="flex flex-col gap-5">
              <p className="text-xs text-muted-foreground">
                Tell ClueZero which table to read from and how to map your columns to competitive intelligence fields.
              </p>

              {/* Connection summary pill */}
              <div className="flex items-center gap-2 bg-zinc-50 border border-border rounded-md px-3 py-2">
                <SnowflakeLogo className="size-4" />
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {creds.account} · {creds.database}.{creds.schema}
                </span>
              </div>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Source table</legend>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sf-table" className="text-xs">Table name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="sf-table"
                    placeholder="AD_PERFORMANCE"
                    className="h-8 text-sm font-mono"
                    value={mapping.table}
                    onChange={e => setMapping(p => ({ ...p, table: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Full path: {creds.database || 'DB'}.{creds.schema || 'SCHEMA'}.{mapping.table || 'TABLE'}
                  </p>
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Column mapping</legend>
                <p className="text-[11px] text-muted-foreground -mt-2">Map your table columns to ClueZero fields. Leave blank to skip a field.</p>

                {([
                  { id: 'brandCol',       label: 'Brand / advertiser',     placeholder: 'brand_name',    required: true  },
                  { id: 'headlineCol',    label: 'Ad headline / creative',  placeholder: 'ad_headline',   required: false },
                  { id: 'spendCol',       label: 'Estimated spend (€)',     placeholder: 'est_spend_eur', required: false },
                  { id: 'impressionsCol', label: 'Impressions',             placeholder: 'impressions',   required: false },
                  { id: 'dateCol',        label: 'Date / week start',       placeholder: 'week_start',    required: true  },
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

          {/* ── Step 3: Test & Connect ── */}
          {step === 'test' && (
            <div className="flex flex-col gap-5">
              {testChecks === 'idle' && (
                <>
                  <p className="text-xs text-muted-foreground">
                    ClueZero will verify your credentials, check warehouse access, and run a sample query before saving the connection.
                  </p>
                  <div className="bg-zinc-50 border border-border rounded-lg p-4 flex flex-col gap-3">
                    <SummaryRow label="Account" value={creds.account} />
                    <SummaryRow label="User" value={creds.username} />
                    <SummaryRow label="Warehouse" value={creds.warehouse} />
                    <SummaryRow label="Table" value={`${creds.database}.${creds.schema}.${mapping.table}`} />
                    <SummaryRow label="Brand column" value={mapping.brandCol} />
                    <SummaryRow label="Date column" value={mapping.dateCol} />
                  </div>
                </>
              )}

              {(testChecks === 'running' || testChecks === 'done' || testChecks === 'failed') && (
                <div className="flex flex-col gap-2">
                  {TEST_CHECKS.map((check, i) => {
                    const done    = completedChecks > i
                    const active  = testChecks === 'running' && completedChecks === i
                    const pending = completedChecks < i

                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs transition-colors',
                          done    && 'bg-emerald-50',
                          active  && 'bg-[#29B5E8]/08',
                          pending && 'opacity-40'
                        )}
                      >
                        <div className="shrink-0 size-4 flex items-center justify-center">
                          {done   && <CheckCircle2 className="size-4 text-emerald-500" />}
                          {active && <Loader2 className="size-4 text-[#29B5E8] animate-spin" />}
                          {pending && <div className="size-2 rounded-full bg-zinc-300" />}
                        </div>
                        <span className={cn(done && 'text-emerald-700', active && 'text-[#29B5E8] font-medium', pending && 'text-muted-foreground')}>
                          {check}
                        </span>
                      </div>
                    )
                  })}

                  {testChecks === 'done' && (
                    <div className="mt-3 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                      <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">Connection verified</p>
                        <p className="text-[11px] text-emerald-600 mt-0.5">
                          Sample query returned 5 rows. Your warehouse is reachable and the column mapping looks correct.
                        </p>
                      </div>
                    </div>
                  )}

                  {testChecks === 'failed' && (
                    <div className="mt-3 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
                      <XCircle className="size-4 text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-rose-700">Connection failed</p>
                        <p className="text-[11px] text-rose-600 mt-0.5">{testError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Success ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="size-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Snowflake connected</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Your warehouse is live. ClueZero will sync {creds.database}.{creds.schema}.{mapping.table} on the next scheduled run.
                </p>
              </div>
              <div className="w-full bg-zinc-50 border border-border rounded-lg p-4 text-left flex flex-col gap-2">
                <SummaryRow label="Account" value={creds.account} />
                <SummaryRow label="Table" value={`${creds.database}.${creds.schema}.${mapping.table}`} />
                <SummaryRow label="Next sync" value="Today at next scheduled run" />
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
              onClick={() => {
                if (step === 'credentials') handleOpenChange(false)
                else {
                  const prev = STEP_ORDER[STEP_ORDER.indexOf(step) - 1]
                  setStep(prev)
                  if (step === 'test') { setTestChecks('idle'); setCompletedChecks(0) }
                }
              }}
            >
              {step === 'credentials' ? 'Cancel' : 'Back'}
            </Button>
          )}

          {step === 'credentials' && (
            <Button
              size="sm"
              className="text-xs h-8 ml-auto bg-[#29B5E8] hover:bg-[#1ea3d5] text-white"
              disabled={!credsValid}
              onClick={() => setStep('mapping')}
            >
              Continue <ChevronRight className="size-3 ml-1" />
            </Button>
          )}

          {step === 'mapping' && (
            <Button
              size="sm"
              className="text-xs h-8 ml-auto bg-[#29B5E8] hover:bg-[#1ea3d5] text-white"
              disabled={!mappingValid}
              onClick={() => setStep('test')}
            >
              Continue <ChevronRight className="size-3 ml-1" />
            </Button>
          )}

          {step === 'test' && testChecks === 'idle' && (
            <Button
              size="sm"
              className="text-xs h-8 ml-auto bg-[#29B5E8] hover:bg-[#1ea3d5] text-white"
              onClick={runTest}
            >
              Test connection
            </Button>
          )}

          {step === 'test' && testChecks === 'running' && (
            <Button size="sm" disabled className="text-xs h-8 ml-auto">
              <Loader2 className="size-3 mr-1.5 animate-spin" /> Testing…
            </Button>
          )}

          {step === 'test' && testChecks === 'done' && (
            <Button
              size="sm"
              className="text-xs h-8 ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setStep('success')}
            >
              Save connection <ChevronRight className="size-3 ml-1" />
            </Button>
          )}

          {step === 'test' && testChecks === 'failed' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 ml-auto"
              onClick={() => { setTestChecks('idle'); setCompletedChecks(0) }}
            >
              Retry
            </Button>
          )}

          {step === 'success' && (
            <Button
              size="sm"
              className="text-xs h-8 w-full bg-[#29B5E8] hover:bg-[#1ea3d5] text-white"
              onClick={handleFinish}
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
