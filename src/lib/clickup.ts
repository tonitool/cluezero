/**
 * ClickUp service via Composio — SERVER ONLY
 *
 * Replaces direct ClickUp API calls with Composio actions.
 *
 * Do NOT import this file in 'use client' components.
 */

import 'server-only'
import { executeAction } from '@/lib/composio'

export interface ClickUpTaskInput {
  listId:      string
  name:        string
  description: string
  priority?:   1 | 2 | 3 | 4
  dueDate?:    number
}

export interface ClickUpTask {
  id:   string
  name: string
  url:  string
}

/**
 * Create a task in a ClickUp list via Composio.
 */
export async function createClickUpTaskComposio(
  workspaceId: string,
  input: ClickUpTaskInput,
): Promise<ClickUpTask | null> {
  try {
    const result = await executeAction(workspaceId, 'CLICKUP_CREATE_TASK', {
      list_id: input.listId,
      name: input.name,
      description: input.description,
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.dueDate ? { due_date: input.dueDate, due_date_time: true } : {}),
    }) as { response?: string; error?: string }

    if (result?.error) {
      console.error('[clickup] Composio create task error:', result.error)
      return null
    }

    const data = parseResponse(result)
    if (!data) return null

    return {
      id: String(data.id ?? ''),
      name: String(data.name ?? ''),
      url: String(data.url ?? ''),
    }
  } catch (err) {
    console.error('[clickup] createTask error:', err)
    return null
  }
}

/**
 * Map a severity string to ClickUp priority number.
 */
export function severityToClickUpPriority(severity: 'high' | 'medium' | 'low'): 1 | 2 | 3 | 4 {
  switch (severity) {
    case 'high':   return 1
    case 'medium': return 2
    case 'low':    return 3
    default:       return 3
  }
}

function parseResponse(result: { response?: string }): Record<string, unknown> | null {
  if (!result?.response) return null
  try {
    return JSON.parse(result.response)
  } catch {
    return null
  }
}
