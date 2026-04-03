'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, User, Lock, Mail, Trash2, RefreshCcw } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FeedbackState = { type: 'success' | 'error'; message: string } | null

function Feedback({ state }: { state: FeedbackState }) {
  if (!state) return null
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md px-3 py-2.5 text-xs',
      state.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
    )}>
      {state.type === 'success'
        ? <CheckCircle2 className="size-3.5 mt-0.5 shrink-0" />
        : <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />}
      {state.message}
    </div>
  )
}

function SectionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-border shadow-sm">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
        <div className="size-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="size-4 text-zinc-600" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">
        {children}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AccountView({ workspaceId }: { workspaceId?: string }) {
  const supabase = createClient()

  // ── User state ──────────────────────────────────────────────────────────────
  const [email, setEmail]         = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
      setDisplayName(data.user?.user_metadata?.display_name ?? '')
      setLoadingUser(false)
    })
  }, [])

  // ── Profile ─────────────────────────────────────────────────────────────────
  const [profileName, setProfileName]       = useState('')
  const [savingProfile, setSavingProfile]   = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState>(null)

  useEffect(() => { setProfileName(displayName) }, [displayName])

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileFeedback(null)
    const { error } = await supabase.auth.updateUser({
      data: { display_name: profileName.trim() }
    })
    setSavingProfile(false)
    if (error) {
      setProfileFeedback({ type: 'error', message: error.message })
    } else {
      setDisplayName(profileName.trim())
      setProfileFeedback({ type: 'success', message: 'Display name updated.' })
    }
  }

  // ── Email ───────────────────────────────────────────────────────────────────
  const [newEmail, setNewEmail]           = useState('')
  const [savingEmail, setSavingEmail]     = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<FeedbackState>(null)

  async function handleChangeEmail() {
    if (!newEmail.trim() || newEmail === email) return
    setSavingEmail(true)
    setEmailFeedback(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setSavingEmail(false)
    if (error) {
      setEmailFeedback({ type: 'error', message: error.message })
    } else {
      setEmailFeedback({
        type: 'success',
        message: `Confirmation sent to ${newEmail}. Click the link to confirm the change.`,
      })
      setNewEmail('')
    }
  }

  // ── Password ────────────────────────────────────────────────────────────────
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [savingPassword, setSavingPassword]   = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState>(null)

  const passwordsMatch  = newPassword === confirmPassword
  const passwordStrong  = newPassword.length >= 8
  const canSavePassword = newPassword && confirmPassword && passwordsMatch && passwordStrong

  async function handleChangePassword() {
    if (!canSavePassword) return
    setSavingPassword(true)
    setPasswordFeedback(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordFeedback({ type: 'error', message: error.message })
    } else {
      setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  // ── Hard reset data ─────────────────────────────────────────────────────────
  const [resetConfirm, setResetConfirm]     = useState('')
  const [resetting, setResetting]           = useState(false)
  const [resetFeedback, setResetFeedback]   = useState<FeedbackState>(null)
  const canReset = resetConfirm === 'RESET'

  async function handleHardReset() {
    if (!canReset || !workspaceId) return
    setResetting(true)
    setResetFeedback(null)
    try {
      const res = await fetch('/api/workspace/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      if (!res.ok) {
        const body = await res.json()
        setResetFeedback({ type: 'error', message: body.error ?? 'Reset failed. Please try again.' })
      } else {
        setResetFeedback({ type: 'success', message: 'All data cleared. Go to Connections and press Sync Now to reload from Snowflake.' })
        setResetConfirm('')
      }
    } catch {
      setResetFeedback({ type: 'error', message: 'Unexpected error. Please try again.' })
    }
    setResetting(false)
  }

  // ── Delete account ──────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm]   = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteFeedback, setDeleteFeedback] = useState<FeedbackState>(null)
  const canDelete = deleteConfirm === 'DELETE'

  async function handleDeleteAccount() {
    if (!canDelete) return
    setDeletingAccount(true)
    setDeleteFeedback(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        setDeleteFeedback({ type: 'error', message: body.error ?? 'Failed to delete account.' })
        setDeletingAccount(false)
        return
      }
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      setDeleteFeedback({ type: 'error', message: 'Unexpected error. Please try again.' })
      setDeletingAccount(false)
    }
  }

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Account"
        description="Manage your profile, credentials, and account settings"
      />

      <div className="flex flex-col gap-5">

        {/* ── Profile ── */}
        <SectionCard icon={User} title="Profile" description="Your public display name shown across the workspace.">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display-name" className="text-xs">Display name</Label>
            <Input
              id="display-name"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Your name"
              className="h-8 text-sm max-w-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Email address</Label>
            <p className="text-sm text-muted-foreground">{email}</p>
            <p className="text-[11px] text-muted-foreground">To change your email address, use the Email section below.</p>
          </div>
          <Feedback state={profileFeedback} />
          <div>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={savingProfile || !profileName.trim() || profileName === displayName}
              onClick={handleSaveProfile}
            >
              {savingProfile && <Loader2 className="size-3 mr-1.5 animate-spin" />}
              Save changes
            </Button>
          </div>
        </SectionCard>

        {/* ── Email ── */}
        <SectionCard icon={Mail} title="Email address" description="Change the email address associated with your account.">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-email" className="text-xs">Current email</Label>
            <p className="text-sm font-medium">{email}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-email" className="text-xs">New email address</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              className="h-8 text-sm max-w-sm"
            />
            <p className="text-[11px] text-muted-foreground">A confirmation link will be sent to the new address.</p>
          </div>
          <Feedback state={emailFeedback} />
          <div>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={savingEmail || !newEmail.trim() || newEmail === email}
              onClick={handleChangeEmail}
            >
              {savingEmail && <Loader2 className="size-3 mr-1.5 animate-spin" />}
              Send confirmation
            </Button>
          </div>
        </SectionCard>

        {/* ── Password ── */}
        <SectionCard icon={Lock} title="Password" description="Choose a strong password of at least 8 characters.">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password" className="text-xs">New password</Label>
            <div className="relative max-w-sm">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-8 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            {newPassword && !passwordStrong && (
              <p className="text-[11px] text-rose-500">Must be at least 8 characters.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password" className="text-xs">Confirm new password</Label>
            <div className="relative max-w-sm">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-8 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-[11px] text-rose-500">Passwords do not match.</p>
            )}
          </div>
          <Feedback state={passwordFeedback} />
          <div>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={savingPassword || !canSavePassword}
              onClick={handleChangePassword}
            >
              {savingPassword && <Loader2 className="size-3 mr-1.5 animate-spin" />}
              Update password
            </Button>
          </div>
        </SectionCard>

        {/* ── Hard reset ── */}
        <SectionCard icon={RefreshCcw} title="Hard reset data" description="Wipe all synced ad data, spend estimates, and brand records from this workspace. Your Snowflake connections are kept. Numbers will return to zero until you sync again.">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-confirm" className="text-xs">
              Type <span className="font-mono font-bold">RESET</span> to confirm
            </Label>
            <Input
              id="reset-confirm"
              value={resetConfirm}
              onChange={e => setResetConfirm(e.target.value)}
              placeholder="RESET"
              className="h-8 text-sm max-w-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              All widgets will show empty until you go to Connections and press Sync Now.
            </p>
          </div>
          <Feedback state={resetFeedback} />
          <div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
              disabled={resetting || !canReset || !workspaceId}
              onClick={handleHardReset}
            >
              {resetting
                ? <><Loader2 className="size-3 mr-1.5 animate-spin" /> Resetting…</>
                : <><RefreshCcw className="size-3 mr-1.5" /> Hard reset all data</>
              }
            </Button>
          </div>
        </SectionCard>

        {/* ── Danger zone ── */}
        <SectionCard icon={Trash2} title="Delete account" description="Permanently delete your account and all associated data. This cannot be undone.">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirm" className="text-xs">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="h-8 text-sm max-w-sm font-mono"
            />
          </div>
          <Feedback state={deleteFeedback} />
          <div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
              disabled={deletingAccount || !canDelete}
              onClick={handleDeleteAccount}
            >
              {deletingAccount
                ? <><Loader2 className="size-3 mr-1.5 animate-spin" /> Deleting…</>
                : <><Trash2 className="size-3 mr-1.5" /> Delete my account</>
              }
            </Button>
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
