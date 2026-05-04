import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/invite/accept
 *
 * Marks the invite as used and adds the current user to the workspace.
 * Called after the user has authenticated on the invite page.
 *
 * Body:
 *   token   — the invite token
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token: string }

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  // Get the authenticated user
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch and validate the invite
  const { data: invite } = await admin
    .from('workspace_invites')
    .select('id, workspace_id, email, role, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }
  if (invite.used_at) {
    return NextResponse.json({ error: 'Invite already used' }, { status: 409 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }
  // If invite is locked to a specific email, enforce it
  if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'This invite is for a different email address' }, { status: 403 })
  }

  // Add the user to the workspace (skip if already a member)
  const { data: existingMember } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!existingMember) {
    const { error: memberErr } = await admin
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role ?? 'client',
      })

    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 })
    }
  }

  // Mark invite as used
  await admin
    .from('workspace_invites')
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq('id', invite.id)

  // Return the workspace slug for redirect
  const { data: workspace } = await admin
    .from('workspaces')
    .select('slug')
    .eq('id', invite.workspace_id)
    .single()

  return NextResponse.json({ workspaceSlug: workspace?.slug })
}
