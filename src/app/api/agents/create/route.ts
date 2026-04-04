import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentOrchestrator } from '@/lib/agents/agent-orchestrator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, agentTypeId, name, config, schedule } = body

    if (!workspaceId || !agentTypeId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, agentTypeId, name' },
        { status: 400 }
      )
    }

    const orchestrator = new AgentOrchestrator(supabase)
    const agent = await orchestrator.createAgent({
      workspaceId,
      agentTypeId,
      name,
      config: config || {},
      schedule,
      userId: user.id,
    })

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create agent' },
      { status: 500 }
    )
  }
}
