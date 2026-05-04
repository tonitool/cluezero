/**
 * Google Ads service via Composio — SERVER ONLY
 *
 * Replaces direct Google Ads REST API calls with Composio actions.
 * All queries go through Composio's connected Google Ads account.
 *
 * Do NOT import this file in 'use client' components.
 */

import 'server-only'
import { executeAction } from '@/lib/composio'

export interface GoogleCampaignRow {
  campaignId:       string
  campaignName:     string
  status:           string
  impressions:      number
  clicks:           number
  ctr:              number
  avgCpc:           number
  spend:            number
  conversions:      number
  conversionValue:  number
  roas:             number | null
}

export interface GoogleAdRow {
  campaignName: string
  adGroupName:  string
  adId:         string
  headline:     string
  status:       string
  impressions:  number
  clicks:       number
  ctr:          number
  spend:        number
  conversions:  number
}

/**
 * Fetch campaign performance via Composio.
 * Uses the GOOGLEADS_REPORT action to run a GAQL query.
 */
export async function getCampaignPerformanceComposio(
  workspaceId: string,
  customerId: string,
  days = 30,
): Promise<GoogleCampaignRow[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date DURING LAST_${days}_DAYS
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50`

  const result = await executeAction(workspaceId, 'GOOGLEADS_EXECUTE_QUERY', {
    customerId,
    query,
  }) as { response?: string; error?: string }

  if (result?.error) {
    console.error('[google-ads] Composio query error:', result.error)
    return []
  }

  const rows = parseResultRows(result)
  return rows.map((r: Record<string, unknown>) => {
    const campaign = r.campaign as { id: string; name: string; status: string } | undefined
    const metrics = r.metrics as {
      impressions: string | number
      clicks: string | number
      ctr: string | number
      average_cpc: string | number
      cost_micros: string | number
      conversions: string | number
      conversions_value: string | number
    } | undefined

    if (!campaign || !metrics) return {} as GoogleCampaignRow

    const spend = Number(metrics.cost_micros) / 1_000_000
    const convValue = Number(metrics.conversions_value)
    return {
      campaignId:      String(campaign.id),
      campaignName:    String(campaign.name),
      status:          String(campaign.status),
      impressions:     Number(metrics.impressions),
      clicks:          Number(metrics.clicks),
      ctr:             Number(metrics.ctr),
      avgCpc:          Number(metrics.average_cpc) / 1_000_000,
      spend,
      conversions:     Number(metrics.conversions),
      conversionValue: convValue,
      roas:            spend > 0 ? convValue / spend : null,
    }
  })
}

/**
 * Fetch top ads by clicks via Composio.
 */
export async function getTopAdsComposio(
  workspaceId: string,
  customerId: string,
  days = 30,
  limit = 10,
): Promise<GoogleAdRow[]> {
  const query = `
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.expanded_text_ad.headline_part1,
      ad_group_ad.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group_ad
    WHERE segments.date DURING LAST_${days}_DAYS
      AND ad_group_ad.status != 'REMOVED'
    ORDER BY metrics.clicks DESC
    LIMIT ${limit}`

  const result = await executeAction(workspaceId, 'GOOGLEADS_EXECUTE_QUERY', {
    customerId,
    query,
  }) as { response?: string; error?: string }

  if (result?.error) {
    console.error('[google-ads] Composio query error:', result.error)
    return []
  }

  const rows = parseResultRows(result)
  return rows.map((r: Record<string, unknown>) => {
    const campaign = r.campaign as { name: string } | undefined
    const adGroup = r.ad_group as { name: string } | undefined
    const adGroupAd = r.ad_group_ad as {
      ad: {
        id: string
        responsive_search_ad?: { headlines: { text: string }[] }
        expanded_text_ad?: { headline_part1: string }
      }
      status: string
    } | undefined
    const metrics = r.metrics as {
      impressions: string | number
      clicks: string | number
      ctr: string | number
      cost_micros: string | number
      conversions: string | number
    } | undefined

    if (!campaign || !adGroup || !adGroupAd || !metrics) return {} as GoogleAdRow

    const rsaHeadline = adGroupAd.ad.responsive_search_ad?.headlines?.[0]?.text
    const etaHeadline = adGroupAd.ad.expanded_text_ad?.headline_part1
    return {
      campaignName: String(campaign.name),
      adGroupName:  String(adGroup.name),
      adId:         String(adGroupAd.ad.id),
      headline:     rsaHeadline ?? etaHeadline ?? '(no headline)',
      status:       String(adGroupAd.status),
      impressions:  Number(metrics.impressions),
      clicks:       Number(metrics.clicks),
      ctr:          Number(metrics.ctr),
      spend:        Number(metrics.cost_micros) / 1_000_000,
      conversions:  Number(metrics.conversions),
    }
  })
}

function parseResultRows(result: { response?: string }): Record<string, unknown>[] {
  if (!result?.response) return []
  try {
    const parsed = JSON.parse(result.response)
    if (Array.isArray(parsed)) return parsed
    if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows
    if (parsed?.results && Array.isArray(parsed.results)) return parsed.results
  } catch { /* not JSON */ }
  return []
}
