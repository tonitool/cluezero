/**
 * Composio client service — SERVER ONLY
 *
 * Manages OAuth connections to external data sources (Snowflake, Google Sheets,
 * Airtable, HubSpot, etc.) via Composio's unified connector platform.
 *
 * Each workspace maps 1:1 to a Composio "user" (V3 terminology).
 * User ID = workspace_id (stable, predictable, easy to look up).
 *
 * Do NOT import this file in 'use client' components — use @/lib/connectors instead.
 */

import 'server-only'
import { Composio } from '@composio/core'
export type { AppInfo } from './connectors'
export { SUPPORTED_CONNECTORS } from './connectors'

const COMPOSIO_BASE = 'https://backend.composio.dev'

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: Composio | null = null

export function getComposioClient(): Composio {
  const key = process.env.COMPOSIO_API_KEY
  if (!key) throw new Error('COMPOSIO_API_KEY not configured')
  if (!_client) _client = new Composio({ apiKey: key })
  return _client
}

function apiKey() {
  const key = process.env.COMPOSIO_API_KEY
  if (!key) throw new Error('COMPOSIO_API_KEY not configured')
  return key
}

// ─── Auth config IDs (from Composio dashboard → Auth Configs) ────────────────
// These correspond to V1 "integration IDs" — same values, new name in V3.

export const INTEGRATION_IDS: Record<string, string | undefined> = {
  snowflake: process.env.COMPOSIO_INTEGRATION_SNOWFLAKE,
  googleads: process.env.COMPOSIO_INTEGRATION_GOOGLEADS,
  meta: process.env.COMPOSIO_INTEGRATION_META,
  asana: process.env.COMPOSIO_INTEGRATION_ASANA,
  clickup: process.env.COMPOSIO_INTEGRATION_CLICKUP,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Safely extract a string message from whatever the API returns as error/message. */
function extractError(json: Record<string, unknown>, status: number): string {
  for (const key of ['error', 'message', 'detail', 'msg']) {
    const v = json[key]
    if (typeof v === 'string' && v) return v
    if (v && typeof v === 'object') {
      const nested = (v as Record<string, unknown>).message
      if (typeof nested === 'string' && nested) return nested
      return JSON.stringify(v)
    }
  }
  return `Composio error ${status}`
}

// ─── Connection management ────────────────────────────────────────────────────

export interface InitiateConnectionResult {
  connectionId: string
  redirectUrl: string | null
  status: string
}

/**
 * Create a connection for a given app using the Composio V3 API.
 *
 * OAuth apps  → POST /api/v3/connected_accounts/link
 *               Returns a redirectUrl the user must visit to complete auth.
 *
 * Basic auth  → POST /api/v3/connected_accounts
 *               Credentials are submitted directly; connection is active immediately.
 */
export async function initiateConnection(
  workspaceId: string,
  appName: string,
  params: Record<string, string> = {},
  redirectUri?: string,
): Promise<InitiateConnectionResult> {
  const authConfigId = INTEGRATION_IDS[appName]
  const isBasicAuth = appName === 'snowflake'

  if (isBasicAuth) {
    // Basic Auth: POST /api/v3/connected_accounts — credentials submitted directly
    const res = await fetch(`${COMPOSIO_BASE}/api/v3/connected_accounts`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_config: { id: authConfigId },
        connection: { user_id: workspaceId, data: params },
      }),
    })

    const json = await res.json() as Record<string, unknown>

    if (!res.ok || json['error']) {
      throw new Error(extractError(json, res.status))
    }

    return {
      connectionId: String(json['id'] ?? ''),
      redirectUrl: null,
      status: 'active',
    }
  }

  // OAuth: POST /api/v3/connected_accounts/link — returns a redirect URL
  const res = await fetch(`${COMPOSIO_BASE}/api/v3/connected_accounts/link`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_config_id: authConfigId,
      user_id: workspaceId,
      ...(redirectUri ? { callback_url: redirectUri } : {}),
    }),
  })

  const oauthJson = await res.json() as Record<string, unknown>

  if (!res.ok || oauthJson['error']) {
    throw new Error(extractError(oauthJson, res.status))
  }

  return {
    connectionId: String(oauthJson['connected_account_id'] ?? ''),
    redirectUrl: typeof oauthJson['redirect_url'] === 'string' ? oauthJson['redirect_url'] : null,
    status: 'pending',
  }
}

/**
 * Poll a specific connected account nanoid for its current status.
 */
export async function getConnectionStatus(
  composioConnectionId: string,
): Promise<{ status: string }> {
  const res = await fetch(`${COMPOSIO_BASE}/api/v3/connected_accounts/${composioConnectionId}`, {
    headers: { 'x-api-key': apiKey() },
  })
  if (!res.ok) return { status: 'disconnected' }
  const json = await res.json() as { status?: string }
  const raw = json.status ?? ''
  return {
    status: raw.toUpperCase() === 'ACTIVE' ? 'active' : raw.toLowerCase(),
  }
}

/**
 * Execute a Composio action using this workspace's connection.
 * E.g. executeAction('workspace-123', 'SNOWFLAKE_EXECUTE_SQL', { statement: 'SELECT ...' })
 */
export async function executeAction(
  workspaceId: string,
  actionName: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const client = getComposioClient()
  const result = await client.tools.execute(actionName, {
    userId: workspaceId,
    arguments: params,
  })
  if (!result.successful) {
    const msg = typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
    throw new Error(msg)
  }
  return result.data
}
