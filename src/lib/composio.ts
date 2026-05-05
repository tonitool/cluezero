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

const COMPOSIO_BASE = 'https://backend.composio.dev'

function apiKey() {
  const key = process.env.COMPOSIO_API_KEY
  if (!key) throw new Error('COMPOSIO_API_KEY not configured')
  return key
}

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
export type { AppInfo } from './connectors'
export { SUPPORTED_CONNECTORS } from './connectors'

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: Composio | null = null

export function getComposioClient(): Composio {
  const key = process.env.COMPOSIO_API_KEY
  if (!key) throw new Error('COMPOSIO_API_KEY not configured')
  if (!_client) _client = new Composio({ apiKey: key })
  return _client
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

// ─── Connection management ────────────────────────────────────────────────────

export interface InitiateConnectionResult {
  connectionId: string
  redirectUrl: string | null
  status: string
}

/**
 * Create a connection for a given app.
 *
 * Basic auth (Snowflake) → raw POST /api/v3/connected_accounts with
 *   connection.data carrying credentials. The SDK's initiate() silently
 *   drops options.data (it only maps options.config → connection.state),
 *   so we must go direct for basic-auth apps.
 *
 * OAuth apps → SDK connectedAccounts.initiate() which handles the
 *   correct link/redirect flow.
 */
export async function initiateConnection(
  workspaceId: string,
  appName: string,
  params: Record<string, string> = {},
  redirectUri?: string,
): Promise<InitiateConnectionResult> {
  const authConfigId = INTEGRATION_IDS[appName]
  if (!authConfigId) throw new Error(`No auth config ID configured for ${appName}`)

  // ── Basic auth (Snowflake) ──────────────────────────────────────────────────
  if (appName === 'snowflake') {
    // Strip empty strings — Composio treats "" as missing for required fields
    const data = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
    const res = await fetch(`${COMPOSIO_BASE}/api/v3/connected_accounts`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_config: { id: authConfigId },
        connection: { user_id: workspaceId, data },
      }),
    })
    const json = await res.json() as Record<string, unknown>
    if (!res.ok) throw new Error(extractError(json, res.status))
    return { connectionId: String(json['id'] ?? ''), redirectUrl: null, status: 'active' }
  }

  // ── OAuth apps ──────────────────────────────────────────────────────────────
  const client = getComposioClient()
  const request = await client.connectedAccounts.initiate(workspaceId, authConfigId, {
    callbackUrl: redirectUri,
  })
  const raw = (request.status ?? '').toUpperCase()
  return {
    connectionId: request.id ?? '',
    redirectUrl: request.redirectUrl ?? null,
    status: raw === 'ACTIVE' ? 'active' : 'pending',
  }
}

/**
 * Poll a specific connected account nanoid for its current status.
 */
export async function getConnectionStatus(
  composioConnectionId: string,
): Promise<{ status: string }> {
  try {
    const client = getComposioClient()
    const account = await client.connectedAccounts.get(composioConnectionId)
    const raw = (account.status ?? '').toUpperCase()
    return { status: raw === 'ACTIVE' ? 'active' : raw.toLowerCase() || 'disconnected' }
  } catch {
    return { status: 'disconnected' }
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
