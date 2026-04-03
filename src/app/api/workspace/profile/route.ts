import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

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
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: ws } = await admin
    .from('workspaces')
    .select('name, slug, own_brand, company_name, industry, website, brand_description, target_audience, ai_context, strategy_context')
    .eq('id', workspaceId)
    .single()

  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    name:              ws.name,
    slug:              ws.slug,
    ownBrand:          ws.own_brand          ?? '',
    companyName:       ws.company_name       ?? '',
    industry:          ws.industry           ?? '',
    website:           ws.website            ?? '',
    brandDescription:  ws.brand_description  ?? '',
    targetAudience:    ws.target_audience    ?? '',
    aiContext:         ws.ai_context         ?? '',
    strategyContext:   ws.strategy_context   ?? null,
  })
}
