'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Pause, Trash2, Plus, Activity, CircleCheck as CheckCircle2, Circle as XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface AgentType {
  id: string
  name: string
  slug: string
  description: string
  capabilities: string[]
  config_schema: Record<string, unknown>
}

interface Agent {
  id: string
  name: string
  status: string
  agent_types: AgentType
  config: Record<string, unknown>
  last_run_at: string | null
  created_at: string
}

interface Task {
  id: string
  task_type: string
  status: string
  created_at: string
  completed_at: string | null
  execution_time_ms: number | null
  error_message: string | null
}

export function AgentsView({ workspaceId }: { workspaceId: string }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentTypes, setAgentTypes] = useState<AgentType[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadAgents()
    loadAgentTypes()
  }, [workspaceId])

  useEffect(() => {
    if (selectedAgent) {
      loadTasks(selectedAgent.id)
    }
  }, [selectedAgent])

  const loadAgents = async () => {
    try {
      const response = await fetch(`/api/agents/list?workspaceId=${workspaceId}`)
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      toast.error('Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  const loadAgentTypes = async () => {
    try {
      const response = await fetch('/api/agents/types')
      const data = await response.json()
      setAgentTypes(data.agentTypes || [])
    } catch (error) {
      toast.error('Failed to load agent types')
    }
  }

  const loadTasks = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/tasks?agentId=${agentId}`)
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      toast.error('Failed to load tasks')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Clock className="h-4 w-4" />
      case 'running':
        return <Activity className="h-4 w-4 animate-pulse" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'default'
      case 'running':
        return 'default'
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'paused':
        return 'secondary'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Marketing Agents</h2>
          <p className="text-muted-foreground">
            Spawn and manage autonomous agents for SEO, content optimization, and more
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first agent to start automating marketing tasks
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedAgent(agent)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription>{agent.agent_types.name}</CardDescription>
                  </div>
                  <Badge variant={getStatusColor(agent.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(agent.status)}
                      {agent.status}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{agent.agent_types.description}</p>
                  {agent.last_run_at && (
                    <p className="text-xs">
                      Last run: {new Date(agent.last_run_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateAgentModal
          workspaceId={workspaceId}
          agentTypes={agentTypes}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadAgents()
            toast.success('Agent created successfully')
          }}
        />
      )}

      {selectedAgent && (
        <AgentDetailsModal
          agent={selectedAgent}
          tasks={tasks}
          onClose={() => setSelectedAgent(null)}
          onRefresh={() => {
            loadAgents()
            if (selectedAgent) loadTasks(selectedAgent.id)
          }}
        />
      )}
    </div>
  )
}

function CreateAgentModal({
  workspaceId,
  agentTypes,
  onClose,
  onSuccess,
}: {
  workspaceId: string
  agentTypes: AgentType[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedType, setSelectedType] = useState<AgentType | null>(null)
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!selectedType || !name) {
      toast.error('Please fill in all required fields')
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          agentTypeId: selectedType.id,
          name,
          config,
        }),
      })

      if (!response.ok) throw new Error('Failed to create agent')

      onSuccess()
    } catch (error) {
      toast.error('Failed to create agent')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New Agent</CardTitle>
          <CardDescription>
            Choose an agent type and configure it for your needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Agent Type</Label>
            <div className="grid gap-2">
              {agentTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all ${
                    selectedType?.id === type.id
                      ? 'ring-2 ring-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedType(type)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{type.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {selectedType && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="My SEO Agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Agent'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AgentDetailsModal({
  agent,
  tasks,
  onClose,
  onRefresh,
}: {
  agent: Agent
  tasks: Task[]
  onClose: () => void
  onRefresh: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{agent.name}</CardTitle>
              <CardDescription>{agent.agent_types.name}</CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No tasks yet
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{task.task_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(task.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                            {task.execution_time_ms && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {task.execution_time_ms}ms
                              </p>
                            )}
                          </div>
                        </div>
                        {task.error_message && (
                          <p className="text-sm text-destructive mt-2">
                            {task.error_message}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="config">
              <pre className="bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(agent.config, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'failed') return 'destructive'
  if (status === 'paused') return 'secondary'
  return 'default'
}
