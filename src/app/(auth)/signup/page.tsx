'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Eye, EyeOff, Loader2, Building2, AlertCircle, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClueZeroMark, ClueZeroWordmark } from '@/components/brand/logo'

const STEPS = ['Account', 'Workspace', 'Done']

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0) // 0 = account, 1 = workspace, 2 = done, 3 = confirm email
  const [alreadyAuthed, setAlreadyAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // If user is already logged in (e.g. they signed up but workspace creation failed),
  // skip straight to the workspace creation step
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAlreadyAuthed(true)
        setStep(1)
      }
    })
  }, [])
  const [workspaceName, setWorkspaceName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const slug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (step === 0) {
      setStep(1)
      return
    }
    await handleSignup()
  }

  async function handleSignup() {
    setLoading(true)
    setError(null)

    // Skip auth steps if user is already logged in
    if (alreadyAuthed) {
      await createWorkspace()
      return
    }

    // Step 1: create auth user
    const { error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      if (authError.message.toLowerCase().includes('rate limit')) {
        setError('Too many sign-up attempts. Please wait a few minutes and try again.')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    // Step 2: sign in immediately so the session cookie is set
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      // Email confirmation required — show dedicated check-email screen
      if (signInError.message.toLowerCase().includes('confirm') || signInError.message.toLowerCase().includes('not confirmed')) {
        setStep(3)
        setLoading(false)
        return
      }
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Step 3: create workspace server-side
    await createWorkspace()
  }

  async function createWorkspace() {
    const res = await fetch('/api/workspace/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workspaceName, slug }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create workspace')
      setLoading(false)
      return
    }

    setStep(2)
    setTimeout(() => {
      router.push(`/dashboard/${data.slug}`)
      router.refresh()
    }, 1200)
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/3 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="mb-16">
            <ClueZeroWordmark width={148} color="white" />
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Set up in<br />
            <span className="text-zinc-400">under 3 minutes.</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-12 leading-relaxed">
            Connect your ad accounts, add competitors, and start seeing insights immediately.
          </p>

          {/* Onboarding steps */}
          <div className="space-y-4">
            {[
              { num: '01', title: 'Create your account', desc: 'Email + password, no credit card needed.' },
              { num: '02', title: 'Name your workspace', desc: 'Invite teammates later from Settings.' },
              { num: '03', title: 'Connect data sources', desc: 'Meta, Google, LinkedIn — OAuth in one click.' },
              { num: '04', title: 'Add competitors', desc: 'We start tracking their ads immediately.' },
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex items-start gap-4">
                <span className="text-zinc-400 font-mono text-xs font-bold mt-1 shrink-0">{num}</span>
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-zinc-500 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 pt-8 border-t border-zinc-800">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <p className="text-zinc-500 text-sm">Free 14-day trial · No credit card required</p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <ClueZeroWordmark width={120} color="white" />
        </div>

        <div className="w-full max-w-sm">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                  i < step ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-white text-zinc-950' :
                  'bg-zinc-800 text-zinc-500'
                )}>
                  {i < step ? <CheckCircle2 className="size-3.5" /> : i + 1}
                </div>
                <span className={cn(
                  'text-xs transition-colors',
                  i === step ? 'text-white font-medium' : 'text-zinc-600'
                )}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-px transition-colors',
                    i < step ? 'bg-emerald-500/50' : 'bg-zinc-800'
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step 2: Success */}
          {step === 2 && (
            <div className="text-center py-8">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-4">
                <CheckCircle2 className="size-7 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">You&apos;re all set!</h2>
              <p className="text-zinc-400 text-sm">Taking you to your workspace…</p>
            </div>
          )}

          {/* Step 3: Confirm email */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="flex size-14 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 mx-auto mb-4">
                <Mail className="size-7 text-zinc-300" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-zinc-400 text-sm mb-1">
                We sent a confirmation link to
              </p>
              <p className="text-white text-sm font-medium mb-4">{email}</p>
              <p className="text-zinc-500 text-xs">
                Click the link to confirm your account, then{' '}
                <Link href="/login" className="text-zinc-300 hover:text-white underline">
                  sign in
                </Link>
                .
              </p>
            </div>
          )}

          {/* Step 0: Account details */}
          {step === 0 && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1.5">Create account</h2>
                <p className="text-zinc-400 text-sm">Start your free 14-day trial.</p>
              </div>

              <form onSubmit={handleNext} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg">
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-zinc-300 text-sm">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-500/50 focus-visible:border-zinc-500/50 h-10"
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
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-500/50 focus-visible:border-zinc-500/50 h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 bg-white text-zinc-950 font-medium hover:bg-zinc-100"
                >
                  Continue
                </Button>
              </form>
            </>
          )}

          {/* Step 1: Workspace name */}
          {step === 1 && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1.5">Name your workspace</h2>
                <p className="text-zinc-400 text-sm">Usually your company or team name.</p>
              </div>

              <form onSubmit={handleNext} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg">
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="workspace" className="text-zinc-300 text-sm">Workspace name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                    <Input
                      id="workspace"
                      placeholder="Acme Corp"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-500/50 focus-visible:border-zinc-500/50 h-10 pl-9"
                    />
                  </div>
                  {slug && (
                    <p className="text-zinc-600 text-xs mt-1">
                      URL: <span className="text-zinc-400">app.cluezero.io/dashboard/<strong>{slug}</strong></span>
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-white text-zinc-950 font-medium hover:bg-zinc-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Creating workspace…
                    </>
                  ) : (
                    'Create workspace'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Back
                </button>
              </form>
            </>
          )}

          {step < 2 && (
            <p className="mt-6 text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link href="/login" className="text-zinc-300 hover:text-white font-medium transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
