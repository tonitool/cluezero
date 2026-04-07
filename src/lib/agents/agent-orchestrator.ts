import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type Agent = Database['public']['Tables']['agents']['Row']
type AgentTask = Database['public']['Tables']['agent_tasks']['Row']
type AgentLog = Database['public']['Tables']['agent_logs']['Insert']

export class AgentOrchestrator {
  private supabase: Awaited<ReturnType<typeof createClient>>

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase
  }

  async createAgent(data: {
    workspaceId: string
    agentTypeId: string
    name: string
    config: Record<string, unknown>
    schedule?: string
    userId: string
  }) {
    const { data: agent, error } = await this.supabase
      .from('agents')
      .insert({
        workspace_id: data.workspaceId,
        agent_type_id: data.agentTypeId,
        name: data.name,
        config: data.config,
        schedule: data.schedule,
        created_by: data.userId,
        status: 'idle',
      })
      .select()
      .maybeSingle()

    if (error) throw error
    if (!agent) throw new Error('Failed to create agent')

    await this.log(agent.id, 'info', `Agent "${data.name}" created`)

    return agent
  }

  async spawnTask(data: {
    agentId: string
    workspaceId: string
    taskType: string
    inputData: Record<string, unknown>
    priority?: number
  }) {
    const { data: task, error } = await this.supabase
      .from('agent_tasks')
      .insert({
        agent_id: data.agentId,
        workspace_id: data.workspaceId,
        task_type: data.taskType,
        input_data: data.inputData,
        priority: data.priority || 5,
        status: 'pending',
      })
      .select()
      .maybeSingle()

    if (error) throw error
    if (!task) throw new Error('Failed to create task')

    await this.log(data.agentId, 'info', `Task "${data.taskType}" spawned`, task.id)

    return task
  }

  async executeTask(taskId: string) {
    const { data: task, error: fetchError } = await this.supabase
      .from('agent_tasks')
      .select('*, agents(*)')
      .eq('id', taskId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!task) throw new Error('Task not found')

    const startTime = Date.now()

    try {
      await this.supabase
        .from('agent_tasks')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      await this.log(task.agent_id, 'info', `Executing task "${task.task_type}"`, taskId)

      const result = await this.processTask(task)

      const executionTime = Date.now() - startTime

      await this.supabase
        .from('agent_tasks')
        .update({
          status: 'completed',
          output_data: result,
          completed_at: new Date().toISOString(),
          execution_time_ms: executionTime,
        })
        .eq('id', taskId)

      await this.supabase
        .from('agents')
        .update({
          status: 'idle',
          last_run_at: new Date().toISOString(),
        })
        .eq('id', task.agent_id)

      await this.log(
        task.agent_id,
        'info',
        `Task completed in ${executionTime}ms`,
        taskId
      )

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.supabase
        .from('agent_tasks')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          execution_time_ms: executionTime,
        })
        .eq('id', taskId)

      await this.supabase
        .from('agents')
        .update({ status: 'failed' })
        .eq('id', task.agent_id)

      await this.log(task.agent_id, 'error', errorMessage, taskId)

      throw error
    }
  }

  private async processTask(task: AgentTask & { agents: Agent }): Promise<Record<string, unknown>> {
    throw new Error('Task processing must be implemented by specific agent handlers')
  }

  async getAgentsByWorkspace(workspaceId: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*, agent_types(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getTasksByAgent(agentId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async getLogsByAgent(agentId: string, limit = 100) {
    const { data, error } = await this.supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async updateAgentStatus(agentId: string, status: Database['public']['Enums']['agent_status']) {
    const { error } = await this.supabase
      .from('agents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', agentId)

    if (error) throw error

    await this.log(agentId, 'info', `Agent status changed to "${status}"`)
  }

  async deleteAgent(agentId: string) {
    const { error } = await this.supabase
      .from('agents')
      .delete()
      .eq('id', agentId)

    if (error) throw error
  }

  private async log(
    agentId: string,
    level: Database['public']['Enums']['log_level'],
    message: string,
    taskId?: string
  ) {
    const logEntry: AgentLog = {
      agent_id: agentId,
      task_id: taskId || null,
      level,
      message,
      metadata: {},
    }

    await this.supabase.from('agent_logs').insert(logEntry)
  }
}
