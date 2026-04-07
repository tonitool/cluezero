import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}
