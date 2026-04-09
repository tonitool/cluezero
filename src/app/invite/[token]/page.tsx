'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { ClueZeroWordmark } from '@/components/brand/logo'

type InviteInfo = {
  workspaceName: string
  workspaceSlug: string
  email: string | null
  valid: boolean
  error?: string
}

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Auth form
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Validate the invite token on load
  useEffect(() => {
    fetch(`/api/invite/validate?token=${params.token}`)
      .then(r => r.json())
      .then((d: InviteInfo) => {
        setInvite(d)
        if (d.email) setEmail(d.email)
        setLoading(false)
      })
      .catch(() => {
        setInvite({ workspaceName: '', workspaceSlug: '', email: null, valid: false, error: 'Could not load invite.' })
        setLoading(false)
      })
  }, [params.token])

  // If user is already logged in, accept the invite immediately
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || !invite?.valid) return
      await acceptInvite(data.user.id)
    })
  }, [invite])

  async function acceptInvite(userId?: string) {
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token, userId }),
    })
    const d = await res.json()
    if (!res.ok) {
      setError(d.error ?? 'Failed to accept invite')
      return false
    }
    return d.workspaceSlug as string
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) { setError(signUpErr.message); return }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) { setError(signInErr.message); return }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) { setError(signInErr.message); return }
      }

      const slug = await acceptInvite()
      if (slug) {
        setDone(true)
        setTimeout(() => router.push(`/dashboard/${slug}`), 1200)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="size-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-12">
      <div className="mb-10">
        <ClueZeroWordmark width={120} color="white" />
      </div>

      <div className="w-full max-w-sm">
        {/* Invalid / expired invite */}
        {!invite?.valid && (
          <div className="text-center space-y-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mx-auto">
              <AlertCircle className="size-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Invalid invite</h2>
            <p className="text-zinc-400 text-sm">{invite?.error ?? 'This invite link has expired or already been used.'}</p>
            <Link href="/login" className="text-sm text-zinc-300 hover:text-white underline">
              Sign in instead
            </Link>
          </div>
        )}

        {/* Success */}
        {done && (
          <div className="text-center space-y-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-white">You&apos;re in!</h2>
            <p className="text-zinc-400 text-sm">Taking you to {invite?.workspaceName}…</p>
          </div>
        )}

        {/* Invite form */}
        {invite?.valid && !done && (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-1.5">
                You&apos;ve been invited
              </h2>
              <p className="text-zinc-400 text-sm">
                Join <span className="text-white font-medium">{invite.workspaceName}</span> on ClueZero
              </p>
            </div>

            {/* Signup / Login toggle */}
            <div className="flex rounded-lg bg-zinc-900 p-1 mb-6">
              {(['signup', 'login'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {m === 'signup' ? 'New account' : 'Sign in'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!!invite.email}
                  required
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-300 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                    minLength={mode === 'signup' ? 8 : undefined}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 bg-white text-zinc-950 font-medium hover:bg-zinc-100"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : mode === 'signup' ? 'Create account & join' : 'Sign in & join'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
