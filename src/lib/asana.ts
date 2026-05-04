/**
 * Asana service via Composio — SERVER ONLY
 *
 * Replaces direct Asana API calls with Composio actions.
 *
 * Do NOT import this file in 'use client' components.
 */

import 'server-only'
import { executeAction } from '@/lib/composio'

export interface AsanaTaskInput {
  projectGid:  string
  name:        string
  notes:       string
  dueOn?:      string
  priority?:   'high' | 'medium' | 'low'
}

export interface AsanaTask {
  gid:       string
  name:      string
  permalink_url: string
}

/**
 * Create a task in an Asana project via Composio.
 */
export async function createAsanaTaskComposio(
  workspaceId: string,
  input: AsanaTaskInput,
): Promise<AsanaTask | null> {
  try {
    const result = await executeAction(workspaceId, 'ASANA_CREATE_TASK', {
      project_gid: input.projectGid,
      name: input.name,
      notes: input.notes,
      ...(input.dueOn ? { due_on: input.dueOn } : {}),
    }) as { response?: string; error?: string }

    if (result?.error) {
      console.error('[asana] Composio create task error:', result.error)
      return null
    }

    const data = parseResponse(result)
    return data?.data as AsanaTask | null
  } catch (err) {
    console.error('[asana] createTask error:', err)
    return null
  }
}

/**
 * List Asana projects via Composio.
 */
export async function listAsanaProjectsComposio(
  workspaceId: string,
): Promise<{ gid: string; name: string }[]> {
  try {
    const result = await executeAction(workspaceId, 'ASANA_LIST_PROJECTS', {}) as { response?: string; error?: string }

    if (result?.error) {
      console.error('[asana] Composio list projects error:', result.error)
      return []
    }

    const data = parseResponse(result)
    const projects = Array.isArray(data?.data) ? data.data : []
    return projects.map((p: { gid: string; name: string }) => ({
      gid: p.gid,
      name: p.name,
    }))
  } catch {
    return []
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
