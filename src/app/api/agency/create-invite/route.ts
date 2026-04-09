import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/agency/create-invite
 *
 * Generates a single-use invite token for a client workspace.
 * Returns a shareable invite URL.
 *
 * Body:
 *   workspaceId  — the client workspace to invite the user into
 *   email        — (optional) lock the invite to a specific email
 */
export async function POST(req: NextRequest) {
  const { workspaceId, email } =
    await req.json() as { workspaceId: string; email?: string }

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Caller must be owner or admin of the workspace
  const { data: callerMembership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: invite, error: inviteErr } = await admin
    .from('workspace_invites')
    .insert({
      workspace_id: workspaceId,
      role: 'client',
      email: email ?? null,
      invited_by: user.id,
    })
    .select('token')
    .single()

  if (inviteErr || !invite) {
    return NextResponse.json({ error: inviteErr?.message ?? 'Failed to create invite' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const inviteUrl = `${baseUrl}/invite/${invite.token}`

  return NextResponse.json({ token: invite.token, url: inviteUrl })
}
