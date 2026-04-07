// Google Ads API helper — fetches campaign/ad performance using stored OAuth tokens.
// Docs: https://developers.google.com/google-ads/api/rest/reference/rest

const API_BASE = 'https://googleads.googleapis.com/v17'

export interface GoogleCampaignRow {
  campaignId:       string
  campaignName:     string
  status:           string
  impressions:      number
  clicks:           number
  ctr:              number   // fraction (0.05 = 5%)
  avgCpc:           number   // micros → EUR
  spend:            number   // EUR
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

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json() as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresAt:   new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

// ── GAQL query helper ─────────────────────────────────────────────────────────

async function gaqlQuery(
  customerId: string,
  query: string,
  accessToken: string,
): Promise<unknown[]> {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
  const res = await fetch(`${API_BASE}/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: {
      'Authorization':   `Bearer ${accessToken}`,
      'developer-token': devToken,
      'Content-Type':    'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Ads API error: ${err}`)
  }
  // searchStream returns newline-delimited JSON batches
  const text = await res.text()
  const rows: unknown[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '[' || trimmed === ']') continue
    try {
      const batch = JSON.parse(trimmed.replace(/^,/, '')) as { results?: unknown[] }
      if (batch.results) rows.push(...batch.results)
    } catch { /* skip malformed lines */ }
  }
  return rows
}

// ── Campaign performance (last 30 days) ──────────────────────────────────────

export async function getCampaignPerformance(
  customerId: string,
  accessToken: string,
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

  const rows = await gaqlQuery(customerId, query, accessToken)

  return rows.map((r: unknown) => {
    const row = r as {
      campaign: { id: string; name: string; status: string }
      metrics:  { impressions: string; clicks: string; ctr: string; average_cpc: string; cost_micros: string; conversions: string; conversions_value: string }
    }
    const spend      = Number(row.metrics.cost_micros) / 1_000_000
    const convValue  = Number(row.metrics.conversions_value)
    return {
      campaignId:      row.campaign.id,
      campaignName:    row.campaign.name,
      status:          row.campaign.status,
      impressions:     Number(row.metrics.impressions),
      clicks:          Number(row.metrics.clicks),
      ctr:             Number(row.metrics.ctr),
      avgCpc:          Number(row.metrics.average_cpc) / 1_000_000,
      spend,
      conversions:     Number(row.metrics.conversions),
      conversionValue: convValue,
      roas:            spend > 0 ? convValue / spend : null,
    }
  })
}

// ── Top ads by clicks (last 30 days) ─────────────────────────────────────────

export async function getTopAds(
  customerId: string,
  accessToken: string,
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

  const rows = await gaqlQuery(customerId, query, accessToken)

  return rows.map((r: unknown) => {
    const row = r as {
      campaign:    { name: string }
      ad_group:    { name: string }
      ad_group_ad: {
        ad: {
          id: string
          responsive_search_ad?: { headlines: { text: string }[] }
          expanded_text_ad?:     { headline_part1: string }
        }
        status: string
      }
      metrics: { impressions: string; clicks: string; ctr: string; cost_micros: string; conversions: string }
    }
    const rsaHeadline  = row.ad_group_ad.ad.responsive_search_ad?.headlines?.[0]?.text
    const etaHeadline  = row.ad_group_ad.ad.expanded_text_ad?.headline_part1
    return {
      campaignName: row.campaign.name,
      adGroupName:  row.ad_group.name,
      adId:         row.ad_group_ad.ad.id,
      headline:     rsaHeadline ?? etaHeadline ?? '(no headline)',
      status:       row.ad_group_ad.status,
      impressions:  Number(row.metrics.impressions),
      clicks:       Number(row.metrics.clicks),
      ctr:          Number(row.metrics.ctr),
      spend:        Number(row.metrics.cost_micros) / 1_000_000,
      conversions:  Number(row.metrics.conversions),
    }
  })
}
