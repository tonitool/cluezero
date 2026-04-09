import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/agency/provision-client
 *
 * Creates a new client workspace on behalf of an agency and optionally
 * invites a client user into it with the 'client' role.
 *
 * Body:
 *   agencyWorkspaceId  — the calling agency's workspace id (used to verify permission)
 *   clientName         — display name for the new client workspace
 *   clientSlug         — URL slug (must be unique)
 *   clientEmail        — (optional) email of the client user to invite
 *
 * Only agency members with role 'owner' or 'admin' may call this endpoint.
 */
export async function POST(req: NextRequest) {
  const { agencyWorkspaceId, clientName, clientSlug, clientEmail } =
    await req.json() as {
      agencyWorkspaceId: string
      clientName: string
      clientSlug: string
      clientEmail?: string
    }

  if (!agencyWorkspaceId || !clientName || !clientSlug) {
    return NextResponse.json(
      { error: 'agencyWorkspaceId, clientName and clientSlug are required' },
      { status: 400 }
    )
  }

  // Verify caller is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify caller has owner or admin role in the agency workspace
  const { data: callerMembership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', agencyWorkspaceId)
    .eq('user_id', user.id)
    .single()

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Resolve the agency's organization (or create one if it doesn't exist yet)
  const { data: agencyWorkspace } = await admin
    .from('workspaces')
    .select('id, organization_id')
    .eq('id', agencyWorkspaceId)
    .single()

  if (!agencyWorkspace) {
    return NextResponse.json({ error: 'Agency workspace not found' }, { status: 404 })
  }

  let orgId: string = agencyWorkspace.organization_id

  if (!orgId) {
    // Auto-create an organization for this agency workspace
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({
        name: `org-${agencyWorkspaceId.slice(0, 8)}`,
        slug: `org-${agencyWorkspaceId.slice(0, 8)}`,
        owner_workspace_id: agencyWorkspaceId,
      })
      .select('id')
      .single()

    if (orgErr || !org) {
      return NextResponse.json({ error: orgErr?.message ?? 'Failed to create org' }, { status: 500 })
    }

    orgId = org.id

    // Tag the agency workspace with this org and type
    await admin
      .from('workspaces')
      .update({ organization_id: orgId, workspace_type: 'agency' })
      .eq('id', agencyWorkspaceId)
  }

  // Ensure slug is unique
  const { data: existing } = await admin
    .from('workspaces')
    .select('id')
    .eq('slug', clientSlug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Workspace URL is already taken' }, { status: 409 })
  }

  // Create the client workspace
  const { data: clientWorkspace, error: wsErr } = await admin
    .from('workspaces')
    .insert({
      name: clientName,
      slug: clientSlug,
      organization_id: orgId,
      workspace_type: 'client',
    })
    .select('id, slug')
    .single()

  if (wsErr || !clientWorkspace) {
    return NextResponse.json({ error: wsErr?.message ?? 'Failed to create workspace' }, { status: 500 })
  }

  // Add the calling agency admin as owner of the client workspace so they can configure it
  await admin
    .from('workspace_members')
    .insert({ workspace_id: clientWorkspace.id, user_id: user.id, role: 'owner' })

  // If a client email was supplied, look up the user and add them as 'client'
  if (clientEmail) {
    const { data: { users } } = await admin.auth.admin.listUsers()
    const clientUser = users?.find(u => u.email === clientEmail)

    if (clientUser) {
      await admin
        .from('workspace_members')
        .insert({ workspace_id: clientWorkspace.id, user_id: clientUser.id, role: 'client' })
    }
    // If the user doesn't exist yet, they'll be added when they sign up or via invite
  }

  return NextResponse.json({ slug: clientWorkspace.slug, workspaceId: clientWorkspace.id })
}
