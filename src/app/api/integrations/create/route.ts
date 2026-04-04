import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WordPressClient } from '@/lib/agents/wordpress-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, type, name, config } = body

    if (!workspaceId || !type || !name || !config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (type === 'wordpress') {
      const wpClient = new WordPressClient({
        url: config.url,
        username: config.username,
        password: config.password,
      })

      try {
        await wpClient.testConnection()
      } catch (error) {
        return NextResponse.json(
          { error: `WordPress connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        )
      }
    }

    const { data: integration, error } = await supabase
      .from('integrations')
      .insert({
        workspace_id: workspaceId,
        type,
        name,
        config,
        status: 'active',
        last_verified_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('Error creating integration:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create integration' },
      { status: 500 }
    )
  }
}
