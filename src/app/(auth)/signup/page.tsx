'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ClueZeroWordmark } from '@/components/brand/logo'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)
  const [alreadyAuthed, setAlreadyAuthed] = useState(false)

  // If user is already logged in (e.g. workspace creation failed previously),
  // hide email/password fields and just ask for workspace name
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAlreadyAuthed(true)
    })
  }, [])

  const slug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!alreadyAuthed) {
      // Create + sign in
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError && !signUpError.message.toLowerCase().includes('already registered')) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        if (signInError.message.toLowerCase().includes('confirm') || signInError.message.toLowerCase().includes('not confirmed')) {
          setError('Please confirm your email before signing in. Check your inbox.')
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }
    }

    // Create workspace
    const res = await fetch('/api/workspace/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workspaceName, slug }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create workspace.')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => {
      router.push(`/dashboard/${data.slug}`)
      router.refresh()
    }, 1000)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-white font-semibold">All set! Taking you to your workspace…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <ClueZeroWordmark width={130} color="white" />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-zinc-400 text-sm">Free 14-day trial · No credit card required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {!alreadyAuthed && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300 text-sm">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
                    placeholder="At least 8 characters"
                    minLength={8}
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
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="workspace" className="text-zinc-300 text-sm">Workspace name</Label>
            <Input
              id="workspace"
              placeholder="Acme Corp"
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-10"
            />
            {slug && (
              <p className="text-zinc-600 text-xs">
                URL: <span className="text-zinc-400">app.cluezero.io/dashboard/<strong>{slug}</strong></span>
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-white text-zinc-950 font-medium hover:bg-zinc-100"
          >
            {loading ? <><Loader2 className="size-4 animate-spin mr-2" /> Creating…</> : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="text-zinc-300 hover:text-white font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
