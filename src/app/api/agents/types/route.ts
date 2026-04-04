import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: agentTypes, error } = await supabase
      .from('agent_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return NextResponse.json({ agentTypes })
  } catch (error) {
    console.error('Error fetching agent types:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agent types' },
      { status: 500 }
    )
  }
}
