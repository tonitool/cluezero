'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarChart3, AlertCircle, Eye, EyeOff, Loader2, Zap, Brain, ImageIcon } from 'lucide-react'
import { ClueZeroMark, ClueZeroWordmark } from '@/components/brand/logo'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Multi-platform spend tracking',
    description: 'Meta, Google & LinkedIn ad intelligence in one unified view.',
  },
  {
    icon: ImageIcon,
    title: 'Competitor creative library',
    description: 'Capture, classify and benchmark every ad your rivals run.',
  },
  {
    icon: Brain,
    title: 'Strategy Intelligence Agent',
    description: 'AI-generated weekly briefs with threats, opportunities & recommendations.',
  },
  {
    icon: Zap,
    title: 'Real-time alerts',
    description: 'Get notified the moment a competitor changes their spend or creative.',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900" />
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Red glow blob */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/3 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-16">
            <ClueZeroWordmark width={148} color="white" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Know every move<br />
            <span className="text-zinc-300">before they make it.</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-12 leading-relaxed">
            Competitive intelligence that turns rival ad data into your strategic advantage.
          </p>

          {/* Feature list */}
          <div className="space-y-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700">
                  <Icon className="size-4 text-zinc-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium mb-0.5">{title}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat strip */}
        <div className="relative z-10 flex items-center gap-8 pt-8 border-t border-zinc-800">
          {[
            { value: '25M+', label: 'Ads tracked' },
            { value: '7', label: 'Platforms' },
            { value: '99.9%', label: 'Uptime' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <ClueZeroWordmark width={120} color="white" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
            <p className="text-zinc-400 text-sm">Sign in to your workspace to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 text-sm">
                Work email
              </Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300 text-sm">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
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
              disabled={loading}
              className="w-full h-10 bg-white text-zinc-950 font-medium hover:bg-zinc-100 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            No account?{' '}
            <Link href="/signup" className="text-zinc-300 hover:text-white font-medium transition-colors">
              Create one free
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-zinc-600">
            By signing in you agree to our{' '}
            <a href="#" className="underline hover:text-zinc-400">Terms</a> and{' '}
            <a href="#" className="underline hover:text-zinc-400">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
