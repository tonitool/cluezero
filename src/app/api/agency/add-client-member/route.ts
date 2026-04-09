import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/agency/add-client-member
 *
 * Adds an existing auth user to a workspace with the 'client' role.
 * Only agency owners/admins (members of the workspace) may call this.
 *
 * Body:
 *   workspaceId  — the client workspace to add the user to
 *   email        — the email address of the user to add
 */
export async function POST(req: NextRequest) {
  const { workspaceId, email } =
    await req.json() as { workspaceId: string; email: string }

  if (!workspaceId || !email) {
    return NextResponse.json({ error: 'workspaceId and email are required' }, { status: 400 })
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

  // Caller must be owner or admin of the target workspace
  const { data: callerMembership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Find the user by email
  const { data: { users } } = await admin.auth.admin.listUsers()
  const targetUser = users?.find(u => u.email === email)

  if (!targetUser) {
    return NextResponse.json({ error: 'No account found for that email address' }, { status: 404 })
  }

  // Upsert with 'client' role (do not downgrade an existing admin)
  const { data: existing } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUser.id)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'User already has access', role: existing.role })
  }

  const { error: insertErr } = await admin
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: targetUser.id, role: 'client' })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Client member added successfully' })
}
