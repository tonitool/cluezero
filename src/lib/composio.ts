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

export async function initiateConnection(
  workspaceId: string,
  appName: string,
  _params: Record<string, string> = {},
  redirectUri?: string,
): Promise<InitiateConnectionResult> {
  const authConfigId = INTEGRATION_IDS[appName]
  if (!authConfigId) throw new Error(`No auth config ID configured for ${appName}`)

  // ── All apps (OAuth + BASIC) — use Composio-hosted flow ────────────────────
  // link() creates a Composio Connect Link (platform.composio.dev/link/…) that
  // hosts the credential form for BASIC auth apps and the OAuth consent for OAuth apps.
  const client = getComposioClient()
  const request = await client.connectedAccounts.link(workspaceId, authConfigId, {
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
