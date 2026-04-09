import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * GET /api/agency/clients?workspaceId=...
 *
 * Returns all users with role 'client' in the given workspace,
 * plus the active invite link (if any) for that workspace.
 *
 * Clients are direct members of the agency workspace — no sub-workspace needed.
 */
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify caller is owner/admin
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all client-role members of this workspace
  const { data: clientMembers } = await admin
    .from('workspace_members')
    .select('user_id, created_at')
    .eq('workspace_id', workspaceId)
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  // Resolve emails via auth admin
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map((authUsers ?? []).map(u => [u.id, u.email ?? '']))

  const clients = (clientMembers ?? []).map(m => ({
    userId: m.user_id,
    email: emailMap.get(m.user_id) ?? '—',
    joinedAt: m.created_at,
  }))

  // Fetch active invite links for this workspace
  let activeInviteToken: string | null = null
  let activeInviteCount = 0
  try {
    const { data: invites } = await admin
      .from('workspace_invites')
      .select('token, used_at, expires_at')
      .eq('workspace_id', workspaceId)
      .eq('role', 'client')
      .order('created_at', { ascending: false })

    const active = (invites ?? []).filter(
      i => !i.used_at && new Date(i.expires_at) > new Date()
    )
    activeInviteToken = active[0]?.token ?? null
    activeInviteCount = active.length
  } catch {
    // workspace_invites table may not exist yet — not fatal
  }

  return NextResponse.json({ clients, activeInviteToken, activeInviteCount })
}
