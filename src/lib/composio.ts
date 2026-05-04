/**
 * Composio client service — SERVER ONLY
 *
 * Manages OAuth connections to external data sources (Snowflake, Google Sheets,
 * Airtable, HubSpot, etc.) via Composio's unified connector platform.
 *
 * Each workspace maps 1:1 to a Composio "entity".
 * Entity ID = workspace_id (stable, predictable, easy to look up).
 *
 * Do NOT import this file in 'use client' components — use @/lib/connectors instead.
 */

import 'server-only'
import { Composio } from 'composio-core'
export type { AppInfo } from './connectors'
export { SUPPORTED_CONNECTORS } from './connectors'

const COMPOSIO_BASE = 'https://backend.composio.dev'

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: Composio | null = null

export function getComposioClient(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) throw new Error('COMPOSIO_API_KEY not configured')
  if (!_client) _client = new Composio({ apiKey })
  return _client
}

function apiKey() {
  const key = process.env.COMPOSIO_API_KEY
  if (!key) throw new Error('COMPOSIO_API_KEY not configured')
  return key
}

/** Each workspace = one Composio entity. Returns the entity handle. */
export function getEntity(workspaceId: string) {
  return getComposioClient().getEntity(workspaceId)
}

// ─── Integration IDs (from Composio dashboard) ───────────────────────────────

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
 * For OAuth apps: returns a redirectUrl the user must visit to complete auth.
 * For Basic Auth apps (e.g. Snowflake): credentials are submitted directly
 * and the connection is active immediately — no redirect needed.
 */
export async function initiateConnection(
  workspaceId: string,
  appName: string,
  params: Record<string, string> = {},
  redirectUri?: string,
): Promise<InitiateConnectionResult> {
  const integrationId = INTEGRATION_IDS[appName]

  // Basic Auth apps don't need OAuth redirect — credentials are submitted directly
  const isBasicAuth = appName === 'snowflake'

  const body: Record<string, unknown> = {
    integrationId,
    entityId: workspaceId,
    data: params,
  }
  if (redirectUri && !isBasicAuth) body.redirectUri = redirectUri

  const res = await fetch(`${COMPOSIO_BASE}/api/v1/connectedAccounts`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json() as {
    connectedAccountId?: string
    redirectUrl?: string
    connectionStatus?: string
    error?: string
  }

  if (!res.ok || json.error) {
    throw new Error(json.error ?? `Composio error: ${res.status}`)
  }

  // Basic Auth: connection is active immediately
  if (isBasicAuth) {
    return {
      connectionId: json.connectedAccountId ?? '',
      redirectUrl: null,
      status: 'active',
    }
  }

  return {
    connectionId: json.connectedAccountId ?? '',
    redirectUrl: json.redirectUrl ?? null,
    status: json.connectionStatus?.toLowerCase() === 'initiated' ? 'pending' : (json.connectionStatus ?? 'pending'),
  }
}

/**
 * Poll a specific connectedAccountId for its current status.
 */
export async function getConnectionStatus(
  composioConnectionId: string,
): Promise<{ status: string }> {
  const res = await fetch(`${COMPOSIO_BASE}/api/v1/connectedAccounts/${composioConnectionId}`, {
    headers: { 'x-api-key': apiKey() },
  })
  if (!res.ok) return { status: 'disconnected' }
  const json = await res.json() as { status?: string }
  const raw = json.status ?? ''
  return {
    status: raw === 'ACTIVE' ? 'active' : raw.toLowerCase(),
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
  const entity = getEntity(workspaceId)
  return entity.execute({ actionName, params })
}
