import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentOrchestrator } from '@/lib/agents/agent-orchestrator'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 })
    }

    const orchestrator = new AgentOrchestrator(supabase)
    const tasks = await orchestrator.getTasksByAgent(agentId, limit)

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
