'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ChevronLeft, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUPPORTED_CONNECTORS, type AppInfo } from '@/lib/connectors'

// ─── Connection catalogue ─────────────────────────────────────────────────────

type ConnectionId = 'snowflake' | 'bigquery' | 'redshift' | 'googleads' | 'meta' | 'asana' | 'clickup' | 'slack' | 'googlesheets' | 'airtable' | 'notion' | 'hubspot' | 'salesforce' | 'databricks'

interface ConnectionOption {
  id:          ConnectionId
  name:        string
  tag:         string
  category:    'Data Warehouse' | 'Ad Platforms' | 'Output Tools' | 'Spreadsheet' | 'Database' | 'CRM'
  available:   boolean
  color:       string
  logo:        React.ReactNode
}

const OPTIONS: ConnectionOption[] = [
  {
    id: 'snowflake', name: 'Snowflake', tag: 'OAuth 2.0',
    category: 'Data Warehouse', available: true, color: '#29B5E8',
    logo: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path d="M12 2v20M2 12h20" stroke="#29B5E8" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" stroke="#29B5E8" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'databricks', name: 'Databricks', tag: 'OAuth 2.0',
    category: 'Data Warehouse', available: true, color: '#FF3621',
    logo: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path d="M12 2L4 6v12l8 4 8-4V6L12 2z" stroke="#FF3621" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 8v8M8 12h8" stroke="#FF3621" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'bigquery', name: 'BigQuery', tag: 'OAuth 2.0',
    category: 'Data Warehouse', available: false, color: '#4285F4',
    logo: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path d="M12 2L4 6v12l8 4 8-4V6L12 2z" stroke="#4285F4" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 8v8M8 12h8" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'redshift', name: 'Redshift', tag: 'OAuth 2.0',
    category: 'Data Warehouse', available: false, color: '#8C4FFF',
    logo: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <ellipse cx="12" cy="8" rx="8" ry="4" stroke="#8C4FFF" strokeWidth="2"/>
        <path d="M4 8v8c0 2.21 3.58 4 8 4s8-1.79 8-4V8" stroke="#8C4FFF" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    id: 'googleads', name: 'Google Ads', tag: 'OAuth 2.0',
    category: 'Ad Platforms', available: true, color: '#4285F4',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'meta', name: 'Meta Ads', tag: 'OAuth 2.0',
    category: 'Ad Platforms', available: true, color: '#1877F2',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'asana', name: 'Asana', tag: 'OAuth 2.0',
    category: 'Output Tools', available: true, color: '#F06A6A',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="6.5"  r="4.5" fill="#F06A6A"/>
        <circle cx="5.5"  cy="16.5" r="4.5" fill="#FFB3A7"/>
        <circle cx="18.5" cy="16.5" r="4.5" fill="#E8384F"/>
      </svg>
    ),
  },
  {
    id: 'clickup', name: 'ClickUp', tag: 'OAuth 2.0',
    category: 'Output Tools', available: true, color: '#7B68EE',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="M3 14.5L7.5 10l3 3 4-5 6 6" stroke="#7B68EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'slack', name: 'Slack', tag: 'OAuth 2.0',
    category: 'Output Tools', available: false, color: '#611F69',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="9" width="5" height="5" rx="2.5" fill="#611F69"/>
        <rect x="9" y="2" width="5" height="5" rx="2.5" fill="#E01E5A"/>
        <rect x="9" y="9" width="5" height="5" rx="2.5" fill="#36C5F0"/>
        <rect x="16" y="9" width="5" height="5" rx="2.5" fill="#2EB67D"/>
        <rect x="9" y="16" width="5" height="5" rx="2.5" fill="#ECB22E"/>
      </svg>
    ),
  },
  {
    id: 'googlesheets', name: 'Google Sheets', tag: 'OAuth 2.0',
    category: 'Spreadsheet', available: true, color: '#0F9D58',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#0F9D58" strokeWidth="2"/>
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="#0F9D58" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'airtable', name: 'Airtable', tag: 'OAuth 2.0',
    category: 'Database', available: true, color: '#18BFFF',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#18BFFF"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#18BFFF" opacity="0.6"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#18BFFF" opacity="0.6"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#18BFFF" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: 'notion', name: 'Notion', tag: 'OAuth 2.0',
    category: 'Database', available: true, color: '#000000',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16v16H4V4z" stroke="#000000" strokeWidth="2"/>
        <path d="M8 8h8M8 12h8M8 16h5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'hubspot', name: 'HubSpot', tag: 'OAuth 2.0',
    category: 'CRM', available: true, color: '#FF7A59',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="#FF7A59" strokeWidth="2"/>
        <path d="M12 8v4l3 3" stroke="#FF7A59" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'salesforce', name: 'Salesforce', tag: 'OAuth 2.0',
    category: 'CRM', available: true, color: '#00A1E0',
    logo: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 4C8 4 5 7 5 11c0 1 .2 2 .6 3C4 14.5 3 16 3 17.5 3 20 5.5 22 8 22h9c3.5 0 6-2.5 6-6 0-3-2-5.5-4.5-6C18 7 15.5 4 12 4z" stroke="#00A1E0" strokeWidth="2"/>
      </svg>
    ),
  },
]

const CATEGORIES: ConnectionOption['category'][] = ['Data Warehouse', 'Ad Platforms', 'Output Tools', 'Spreadsheet', 'Database', 'CRM']

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:              boolean
  onOpenChange:      (open: boolean) => void
  workspaceId?:      string
  onConnected?:      () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddConnectionSheet({
  open, onOpenChange, workspaceId, onConnected,
}: Props) {
  const [selected,      setSelected]      = useState<AppInfo | null>(null)
  const [connecting,    setConnecting]    = useState(false)
  const [error,         setError]         = useState('')
  const [pendingAuth,   setPendingAuth]   = useState<{ redirectUrl: string; connectionId: string } | null>(null)
  const [inputFields,   setInputFields]   = useState<Record<string, string>>({})

  function reset() {
    setSelected(null); setConnecting(false); setError('')
    setPendingAuth(null); setInputFields({})
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  async function handleConnect(app: AppInfo) {
    if (!workspaceId) return
    setConnecting(true); setError('')

    try {
      const res = await fetch('/api/connections/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, appName: app.key, params: inputFields }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Connection failed'); return }

      if (data.redirectUrl) {
        setPendingAuth({ redirectUrl: data.redirectUrl, connectionId: data.connectionId })
        window.open(data.redirectUrl, '_blank', 'width=600,height=700')
      } else {
        setPendingAuth(null)
        onConnected?.()
        handleOpenChange(false)
      }
    } catch {
      setError('Network error')
    } finally {
      setConnecting(false)
    }
  }

  function handlePick(opt: ConnectionOption) {
    if (!opt.available) return
    const app = SUPPORTED_CONNECTORS.find(a => a.key === opt.id)
    if (!app) return

    if (app.inputFields?.length) {
      setSelected(app)
      setInputFields(Object.fromEntries(app.inputFields.map(f => [f.name, ''])))
    } else {
      void handleConnect(app)
    }
  }

  // Poll for OAuth completion
  useState(() => {
    if (!pendingAuth || !workspaceId) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/connections/status?workspaceId=${workspaceId}&connectionId=${pendingAuth.connectionId}`)
      const data = await res.json()
      if (data.status === 'active') {
        clearInterval(interval)
        setPendingAuth(null)
        onConnected?.()
        handleOpenChange(false)
      }
    }, 2500)
    return () => clearInterval(interval)
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto p-0">
        <SheetHeader className="px-7 pt-7 pb-5 border-b border-border/70 mb-0 pr-14">
          {selected && (
            <button
              onClick={() => { setSelected(null); setInputFields({}) }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 w-fit"
            >
              <ChevronLeft className="size-3.5" /> All connections
            </button>
          )}
          <SheetTitle className="text-xl font-semibold tracking-tight">
            {selected ? `Connect ${selected.displayName}` : 'Add Connection'}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {selected
              ? `Connect your ${selected.displayName} account via Composio`
              : 'Choose a data source or output tool to connect'}
          </SheetDescription>
        </SheetHeader>

        <div className="px-7 py-7">
          {!selected && (
            <div className="space-y-8">
              {CATEGORIES.map(cat => {
                const apps = OPTIONS.filter(o => o.category === cat)
                if (apps.length === 0) return null
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{cat}</p>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {apps.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handlePick(opt)}
                          disabled={!opt.available}
                          className={cn(
                            'group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150',
                            opt.available
                              ? 'bg-white border-border hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-sm'
                              : 'bg-zinc-50/50 border-border/60 opacity-40 cursor-not-allowed'
                          )}
                        >
                          <div
                            className="size-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105"
                            style={{
                              backgroundColor: `${opt.color}14`,
                              border: `1.5px solid ${opt.color}22`,
                              boxShadow: opt.available ? `0 2px 8px ${opt.color}18` : 'none',
                            }}
                          >
                            {opt.logo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{opt.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {opt.available ? opt.tag : 'Coming soon'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selected && !pendingAuth && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.logo} alt={selected.displayName} className="size-10 rounded-xl object-contain" />
                <div>
                  <p className="text-sm font-semibold">{selected.displayName}</p>
                  <p className="text-xs text-muted-foreground">Powered by Composio · {selected.actionsCount} actions</p>
                </div>
              </div>

              {selected.inputFields?.map(field => (
                <div key={field.name}>
                  <label className="text-xs font-medium block mb-1">
                    {field.label}
                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type="text"
                    value={inputFields[field.name] ?? ''}
                    onChange={e => setInputFields(prev => ({ ...prev, [field.name]: e.target.value }))}
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

              <Button
                className="w-full gap-2"
                onClick={() => handleConnect(selected)}
                disabled={connecting}
              >
                {connecting ? <><Loader2 className="size-4 animate-spin" />Connecting…</> : <>Connect <ExternalLink className="size-3.5" /></>}
              </Button>
            </div>
          )}

          {pendingAuth && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="size-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Loader2 className="size-6 text-amber-500 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold">Waiting for authorisation…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete the OAuth flow in the browser window that opened.
                </p>
              </div>
              <button
                onClick={() => window.open(pendingAuth.redirectUrl, '_blank', 'width=600,height=700')}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Open window again
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
