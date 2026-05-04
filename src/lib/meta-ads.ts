/**
 * Meta Ads service via Composio — SERVER ONLY
 *
 * Replaces direct Meta Marketing API calls with Composio actions.
 * All queries go through Composio's connected Meta account.
 *
 * Do NOT import this file in 'use client' components.
 */

import 'server-only'
import { executeAction } from '@/lib/composio'

export interface MetaCampaignRow {
  campaignId:      string
  campaignName:    string
  status:          string
  impressions:     number
  clicks:          number
  ctr:             number
  spend:           number
  reach:           number
  conversions:     number
  conversionValue: number
  roas:            number | null
}

export interface MetaAdRow {
  campaignName: string
  adSetName:    string
  adId:         string
  adName:       string
  status:       string
  impressions:  number
  clicks:       number
  ctr:          number
  spend:        number
  reach:        number
  conversions:  number
}

function sumActions(actions: { action_type: string; value: string }[], types: string[]): number {
  if (!actions) return 0
  return actions
    .filter(a => types.some(t => a.action_type.includes(t)))
    .reduce((s, a) => s + Number(a.value), 0)
}

/**
 * Fetch campaign performance via Composio.
 * Uses the META_ADS_INSIGHTS action to get campaign-level insights.
 */
export async function getMetaCampaignPerformanceComposio(
  workspaceId: string,
  accountId: string,
  days = 30,
): Promise<MetaCampaignRow[]> {
  const datePreset = days <= 7 ? 'last_7d' : days <= 28 ? 'last_28d' : 'last_30d'

  const result = await executeAction(workspaceId, 'META_ADS_GET_INSIGHTS', {
    accountId,
    level: 'campaign',
    fields: 'campaign_id,campaign_name,impressions,clicks,ctr,spend,reach,actions,action_values',
    datePreset,
    limit: 50,
  }) as { response?: string; error?: string }

  if (result?.error) {
    console.error('[meta-ads] Composio insights error:', result.error)
    return []
  }

  const rows = parseResultRows(result)
  const purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']
  const convTypes = ['purchase', 'lead', 'complete_registration', 'offsite_conversion']

  return rows.map((r: Record<string, unknown>) => {
    const spend = Number(r.spend ?? 0)
    const actions = r.actions as { action_type: string; value: string }[] | undefined
    const actionValues = r.action_values as { action_type: string; value: string }[] | undefined
    const convValue = sumActions(actionValues ?? [], purchaseTypes)
    const convs = sumActions(actions ?? [], convTypes)

    return {
      campaignId:      String(r.campaign_id ?? ''),
      campaignName:    String(r.campaign_name ?? ''),
      status:          String(r.campaign_status ?? 'UNKNOWN'),
      impressions:     Number(r.impressions ?? 0),
      clicks:          Number(r.clicks ?? 0),
      ctr:             Number(r.ctr ?? 0) / 100,
      spend,
      reach:           Number(r.reach ?? 0),
      conversions:     convs,
      conversionValue: convValue,
      roas:            spend > 0 ? convValue / spend : null,
    }
  })
}

/**
 * Fetch top ads by clicks via Composio.
 */
export async function getMetaTopAdsComposio(
  workspaceId: string,
  accountId: string,
  days = 30,
  limit = 10,
): Promise<MetaAdRow[]> {
  const datePreset = days <= 7 ? 'last_7d' : days <= 28 ? 'last_28d' : 'last_30d'

  const result = await executeAction(workspaceId, 'META_ADS_GET_INSIGHTS', {
    accountId,
    level: 'ad',
    fields: 'ad_id,ad_name,adset_name,campaign_name,impressions,clicks,ctr,spend,reach,actions',
    datePreset,
    sort: 'clicks_descending',
    limit: Math.min(limit, 50),
  }) as { response?: string; error?: string }

  if (result?.error) {
    console.error('[meta-ads] Composio insights error:', result.error)
    return []
  }

  const rows = parseResultRows(result)
  const convTypes = ['purchase', 'lead', 'complete_registration', 'offsite_conversion']

  return rows.map((r: Record<string, unknown>) => {
    const actions = r.actions as { action_type: string; value: string }[] | undefined
    return {
      campaignName: String(r.campaign_name ?? ''),
      adSetName:    String(r.adset_name ?? ''),
      adId:         String(r.ad_id ?? ''),
      adName:       String(r.ad_name ?? ''),
      status:       String(r.ad_status ?? 'UNKNOWN'),
      impressions:  Number(r.impressions ?? 0),
      clicks:       Number(r.clicks ?? 0),
      ctr:          Number(r.ctr ?? 0) / 100,
      spend:        Number(r.spend ?? 0),
      reach:        Number(r.reach ?? 0),
      conversions:  sumActions(actions ?? [], convTypes),
    }
  })
}

function parseResultRows(result: { response?: string }): Record<string, unknown>[] {
  if (!result?.response) return []
  try {
    const parsed = JSON.parse(result.response)
    if (Array.isArray(parsed)) return parsed
    if (parsed?.data && Array.isArray(parsed.data)) return parsed.data
    if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows
  } catch { /* not JSON */ }
  return []
}
