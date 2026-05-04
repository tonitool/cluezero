import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const { connectionId, workspaceId } = await req.json() as { connectionId: string; workspaceId: string }
  if (!connectionId || !workspaceId) return NextResponse.json({ error: 'connectionId and workspaceId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: membership } = await admin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { error } = await admin
    .from('connections')
    .delete()
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
