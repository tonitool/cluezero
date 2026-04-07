// ClickUp API helpers

export interface ClickUpTaskInput {
  listId:      string
  name:        string
  description: string
  priority?:   1 | 2 | 3 | 4  // 1=urgent, 2=high, 3=normal, 4=low
  dueDate?:    number           // unix timestamp in ms
}

export interface ClickUpTask {
  id:  string
  name: string
  url: string
}

/**
 * Create a task in a ClickUp list.
 * Returns the created task or null on failure.
 */
export async function createClickUpTask(
  apiToken: string,
  input: ClickUpTaskInput,
): Promise<ClickUpTask | null> {
  try {
    const body: Record<string, unknown> = {
      name:         input.name,
      description:  input.description,
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.dueDate  ? { due_date: input.dueDate, due_date_time: true } : {}),
    }

    const res = await fetch(`https://api.clickup.com/api/v2/list/${input.listId}/task`, {
      method:  'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('ClickUp createTask failed:', await res.text())
      return null
    }

    const data = await res.json() as ClickUpTask
    return data
  } catch (err) {
    console.error('ClickUp createTask error:', err)
    return null
  }
}

/**
 * Map a severity string to ClickUp priority number
 */
export function severityToClickUpPriority(severity: 'high' | 'medium' | 'low'): 1 | 2 | 3 | 4 {
  switch (severity) {
    case 'high':   return 1  // urgent
    case 'medium': return 2  // high
    case 'low':    return 3  // normal
    default:       return 3
  }
}
