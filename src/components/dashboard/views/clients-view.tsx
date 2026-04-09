'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Users, Loader2, Link2, AlertCircle, RefreshCcw, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { cn } from '@/lib/utils'

interface ClientMember {
  userId: string
  email: string
  joinedAt: string
}

interface Props {
  workspaceId: string
}

export function ClientsView({ workspaceId }: Props) {
  const [clients, setClients] = useState<ClientMember[]>([])
  const [activeInviteToken, setActiveInviteToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shownUrl, setShownUrl] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/agency/clients?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error)
        } else {
          setClients(d.clients ?? [])
          setActiveInviteToken(d.activeInviteToken ?? null)
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => { load() }, [load])

  async function handleGenerateInvite() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/agency/create-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      const d = await res.json()
      if (!res.ok) {
        setGenerateError(d.error ?? 'Failed to generate invite link')
        return
      }
      setActiveInviteToken(d.token)
      await copyToken(d.token)
    } catch {
      setGenerateError('Network error — could not generate invite')
    } finally {
      setGenerating(false)
    }
  }

  async function copyToken(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShownUrl(url)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const inviteUrl = activeInviteToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${activeInviteToken}`
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Clients"
        description="Share an invite link with clients. They'll land directly in a read-only Intelligence view of this workspace."
      />

      {/* ── Invite link card ── */}
      <div className="rounded-lg border border-border bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Client invite link</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Anyone with this link can join as a read-only client. Links expire after 30 days.
            </p>
          </div>

          {activeInviteToken ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs shrink-0"
              onClick={() => copyToken(activeInviteToken)}
            >
              {copied ? (
                <><Check className="size-3.5 text-emerald-500" /> Copied!</>
              ) : (
                <><Copy className="size-3.5" /> Copy link</>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs shrink-0"
              disabled={generating}
              onClick={handleGenerateInvite}
            >
              {generating ? (
                <><Loader2 className="size-3.5 animate-spin" /> Generating…</>
              ) : (
                <><Link2 className="size-3.5" /> Generate link</>
              )}
            </Button>
          )}
        </div>

        {/* Show URL inline if clipboard was blocked */}
        {shownUrl && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Clipboard blocked — copy manually:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shownUrl}
                className="flex-1 text-xs font-mono bg-zinc-50 border border-border rounded px-2 py-1.5 outline-none"
                onFocus={e => e.target.select()}
              />
              <button onClick={() => setShownUrl(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
          </div>
        )}

        {/* Active link preview */}
        {inviteUrl && !shownUrl && (
          <div className="flex items-center gap-2 bg-zinc-50 border border-border rounded-md px-3 py-2">
            <Link2 className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">{inviteUrl}</span>
            <button
              onClick={handleGenerateInvite}
              className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Generate a new link"
            >
              <RefreshCcw className="size-3" />
            </button>
          </div>
        )}

        {generateError && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            <span>
              {generateError}
              {(generateError.toLowerCase().includes('relation') || generateError.toLowerCase().includes('exist')) && (
                <> — Run migration <code className="font-mono bg-red-100 px-1 rounded">021_workspace_invites.sql</code> in Supabase SQL Editor first.</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── Client members list ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Active clients ({clients.length})
          </p>
          <button onClick={load} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <RefreshCcw className="size-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <Users className="size-7 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">No clients yet</p>
            <p className="text-xs text-muted-foreground">
              Generate an invite link above and share it with your client.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-white divide-y divide-border overflow-hidden">
            {clients.map(client => (
              <div key={client.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="size-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                  <UserCircle2 className="size-4 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{client.email}</p>
                  <p className="text-xs text-muted-foreground">Joined {formatDate(client.joinedAt)}</p>
                </div>
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  'bg-zinc-100 text-zinc-500'
                )}>
                  client
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-lg bg-zinc-50 border border-border px-4 py-4 space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">How it works</p>
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Generate a client invite link for this workspace.</li>
          <li>Send it to your client.</li>
          <li>They sign up (or log in) and land directly in a read-only Intelligence view of your workspace data.</li>
          <li>You control what they see by configuring tracked brands and widgets here.</li>
        </ol>
      </div>
    </div>
  )
}
