import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// PATCH /api/workspace/colors
// Body: { workspaceId: string, brandColors: Record<string, string> }
// Saves brand colors without requiring workspace name/slug.

export async function PATCH(req: NextRequest) {
  const { workspaceId, brandColors } = await req.json() as {
    workspaceId: string
    brandColors: Record<string, string>
  }

  if (!workspaceId || !brandColors) {
    return NextResponse.json({ error: 'workspaceId and brandColors required' }, { status: 400 })
  }

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

  const { error } = await admin
    .from('workspaces')
    .update({ brand_colors: brandColors })
    .eq('id', workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
