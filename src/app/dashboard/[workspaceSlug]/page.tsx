import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { CompetitiveIntelDashboard } from '@/components/dashboard/competitive-intel-dashboard'

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch workspace by slug
  // Fetch workspace — try with own_brand first, fall back if column doesn't exist yet
  let workspace: { id: string; name: string; slug: string; own_brand?: string | null } | null = null
  const { data: wsWithBrand, error: wsError } = await admin
    .from('workspaces')
    .select('id, name, slug, own_brand')
    .eq('slug', workspaceSlug)
    .single()

  if (!wsError) {
    workspace = wsWithBrand
  } else {
    // Column may not exist yet — fall back to base fields
    const { data: wsBase } = await admin
      .from('workspaces')
      .select('id, name, slug')
      .eq('slug', workspaceSlug)
      .single()
    workspace = wsBase ? { ...wsBase, own_brand: null } : null
  }

  if (!workspace) notFound()

  // Verify the user is a member
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  return (
    <CompetitiveIntelDashboard
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      workspaceSlug={workspace.slug}
      ownBrand={workspace.own_brand ?? ''}
    />
  )
}
