import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * GET /api/invite/validate?token=...
 *
 * Returns basic info about the invite so the page can render
 * the correct workspace name and pre-fill the email field.
 * Does NOT require authentication.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ valid: false, error: 'No token provided' })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: invite } = await admin
    .from('workspace_invites')
    .select('id, workspace_id, email, expires_at, used_at, role')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ valid: false, error: 'Invite not found.' })
  }

  if (invite.used_at) {
    return NextResponse.json({ valid: false, error: 'This invite has already been used.' })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'This invite has expired.' })
  }

  const { data: workspace } = await admin
    .from('workspaces')
    .select('name, slug')
    .eq('id', invite.workspace_id)
    .single()

  return NextResponse.json({
    valid: true,
    workspaceName: workspace?.name ?? '',
    workspaceSlug: workspace?.slug ?? '',
    email: invite.email ?? null,
    role: invite.role,
  })
}
