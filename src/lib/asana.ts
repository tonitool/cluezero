// Asana API helpers

export interface AsanaTokenRefresh {
  access_token: string
  expires_in:   number
}

/**
 * Refresh an expired Asana access token using the stored refresh token.
 */
export async function refreshAsanaToken(refreshToken: string): Promise<AsanaTokenRefresh | null> {
  const clientId     = process.env.ASANA_CLIENT_ID
  const clientSecret = process.env.ASANA_CLIENT_SECRET
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  `${appUrl}/api/connections/asana/callback`,
        refresh_token: refreshToken,
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return {
      access_token: data.access_token,
      expires_in:   data.expires_in,
    }
  } catch {
    return null
  }
}

export interface AsanaTaskInput {
  projectGid:  string
  name:        string
  notes:       string
  dueOn?:      string  // YYYY-MM-DD
  priority?:   'high' | 'medium' | 'low'
}

export interface AsanaTask {
  gid:       string
  name:      string
  permalink_url: string
}

/**
 * Create a task in an Asana project.
 * Returns the created task or null on failure.
 */
export async function createAsanaTask(
  accessToken: string,
  input: AsanaTaskInput,
): Promise<AsanaTask | null> {
  try {
    const body: Record<string, unknown> = {
      data: {
        name:      input.name,
        notes:     input.notes,
        projects:  [input.projectGid],
        ...(input.dueOn ? { due_on: input.dueOn } : {}),
      },
    }

    const res = await fetch('https://app.asana.com/api/1.0/tasks', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Asana createTask failed:', await res.text())
      return null
    }

    const data = await res.json() as { data: AsanaTask }
    return data.data
  } catch (err) {
    console.error('Asana createTask error:', err)
    return null
  }
}
