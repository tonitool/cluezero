import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function PATCH(req: NextRequest) {
  const { workspaceId, name, slug, ownBrand, companyName, industry, website, brandDescription, targetAudience, aiContext, strategyContext } = await req.json() as {
    workspaceId: string
    name: string
    slug: string
    ownBrand?: string
    companyName?: string
    industry?: string
    website?: string
    brandDescription?: string
    targetAudience?: string
    aiContext?: string
    strategyContext?: Record<string, string>
  }

  if (!workspaceId || !name || !slug) {
    return NextResponse.json({ error: 'workspaceId, name and slug required' }, { status: 400 })
  }

  const slugValid = /^[a-z0-9-]+$/.test(slug)
  if (!slugValid) {
    return NextResponse.json({ error: 'Slug can only contain lowercase letters, numbers and hyphens.' }, { status: 400 })
  }

  // Verify caller is an owner or admin of this workspace
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Check slug uniqueness (ignore current workspace)
  const { data: existing } = await admin
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .neq('id', workspaceId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'That URL is already taken.' }, { status: 409 })
  }

  const { error: updateError } = await admin
    .from('workspaces')
    .update({
      name,
      slug,
      ...(ownBrand       !== undefined ? { own_brand:          ownBrand       || null } : {}),
      ...(companyName    !== undefined ? { company_name:       companyName    || null } : {}),
      ...(industry       !== undefined ? { industry:           industry       || null } : {}),
      ...(website        !== undefined ? { website:            website        || null } : {}),
      ...(brandDescription !== undefined ? { brand_description: brandDescription || null } : {}),
      ...(targetAudience !== undefined ? { target_audience:    targetAudience  || null } : {}),
      ...(aiContext        !== undefined ? { ai_context:         aiContext        || null } : {}),
      ...(strategyContext  !== undefined ? { strategy_context:   strategyContext  || null } : {}),
    })
    .eq('id', workspaceId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ name, slug, ownBrand: ownBrand ?? null })
}
