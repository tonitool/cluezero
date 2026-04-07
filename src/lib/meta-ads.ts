// Meta Marketing API helper — fetches campaign/ad performance using stored access tokens.
// Docs: https://developers.facebook.com/docs/marketing-api/reference

const GRAPH_API = 'https://graph.facebook.com/v20.0'

export interface MetaCampaignRow {
  campaignId:      string
  campaignName:    string
  status:          string
  impressions:     number
  clicks:          number
  ctr:             number   // fraction
  spend:           number   // USD (account currency)
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

// ── Token extend (refresh long-lived token — extend for another 60 days) ─────

export async function extendMetaToken(accessToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  const res = await fetch(
    `${GRAPH_API}/oauth/access_token?` +
    new URLSearchParams({
      grant_type:        'fb_exchange_token',
      client_id:         process.env.META_APP_ID!,
      client_secret:     process.env.META_APP_SECRET!,
      fb_exchange_token: accessToken,
    })
  )
  if (!res.ok) return null
  const data = await res.json() as { access_token: string; expires_in?: number }
  return {
    accessToken: data.access_token,
    expiresAt:   new Date(Date.now() + (data.expires_in ?? 60 * 24 * 3600) * 1000).toISOString(),
  }
}

// ── Insights helper ───────────────────────────────────────────────────────────

interface InsightRow {
  campaign_id:   string
  campaign_name: string
  impressions:   string
  clicks:        string
  ctr:           string
  spend:         string
  reach:         string
  actions?:      { action_type: string; value: string }[]
  action_values?: { action_type: string; value: string }[]
}

async function fetchInsights(
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<InsightRow[]> {
  const url = `${GRAPH_API}/${path}/insights?` +
    new URLSearchParams({ ...params, access_token: accessToken })

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta API error: ${err}`)
  }
  const data = await res.json() as { data: InsightRow[]; paging?: unknown }
  return data.data ?? []
}

function sumActions(actions: InsightRow['actions'], types: string[]): number {
  if (!actions) return 0
  return actions
    .filter(a => types.some(t => a.action_type.includes(t)))
    .reduce((s, a) => s + Number(a.value), 0)
}

// ── Campaign performance ──────────────────────────────────────────────────────

export async function getMetaCampaignPerformance(
  accountId: string,  // e.g. "act_123456"
  accessToken: string,
  days = 30,
): Promise<MetaCampaignRow[]> {
  const rows = await fetchInsights(accountId, {
    level:        'campaign',
    fields:       'campaign_id,campaign_name,impressions,clicks,ctr,spend,reach,actions,action_values',
    date_preset:  days <= 7 ? 'last_7d' : days <= 28 ? 'last_28d' : 'last_30d',
    limit:        '50',
  }, accessToken)

  // Fetch campaign statuses separately
  const statusRes = await fetch(
    `${GRAPH_API}/${accountId}/campaigns?fields=id,status&limit=100&access_token=${accessToken}`
  )
  const statusMap: Record<string, string> = {}
  if (statusRes.ok) {
    const statusData = await statusRes.json() as { data: { id: string; status: string }[] }
    for (const c of (statusData.data ?? [])) statusMap[c.id] = c.status
  }

  const purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']
  const convTypes     = ['purchase', 'lead', 'complete_registration', 'offsite_conversion']

  return rows.map(r => {
    const spend     = Number(r.spend ?? 0)
    const convValue = sumActions(r.action_values, purchaseTypes)
    const convs     = sumActions(r.actions, convTypes)
    return {
      campaignId:      r.campaign_id,
      campaignName:    r.campaign_name,
      status:          statusMap[r.campaign_id] ?? 'UNKNOWN',
      impressions:     Number(r.impressions ?? 0),
      clicks:          Number(r.clicks ?? 0),
      ctr:             Number(r.ctr ?? 0) / 100,  // Meta returns percentage
      spend,
      reach:           Number(r.reach ?? 0),
      conversions:     convs,
      conversionValue: convValue,
      roas:            spend > 0 ? convValue / spend : null,
    }
  })
}

// ── Top ads by clicks ─────────────────────────────────────────────────────────

interface AdInsightRow extends InsightRow {
  ad_id:       string
  ad_name:     string
  adset_name:  string
}

export async function getMetaTopAds(
  accountId: string,
  accessToken: string,
  days = 30,
  limit = 10,
): Promise<MetaAdRow[]> {
  const url = `${GRAPH_API}/${accountId}/insights?` +
    new URLSearchParams({
      level:       'ad',
      fields:      'ad_id,ad_name,adset_name,campaign_name,impressions,clicks,ctr,spend,reach,actions',
      date_preset: days <= 7 ? 'last_7d' : days <= 28 ? 'last_28d' : 'last_30d',
      sort:        'clicks_descending',
      limit:       String(Math.min(limit, 50)),
      access_token: accessToken,
    })

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Meta API error: ${await res.text()}`)

  const data = await res.json() as { data: AdInsightRow[] }
  const rows = data.data ?? []

  // Fetch ad statuses
  const adIds = rows.map(r => r.ad_id).filter(Boolean)
  const statusMap: Record<string, string> = {}
  if (adIds.length) {
    const statusRes = await fetch(
      `${GRAPH_API}/?ids=${adIds.join(',')}&fields=id,status&access_token=${accessToken}`
    )
    if (statusRes.ok) {
      const statusData = await statusRes.json() as Record<string, { id: string; status: string }>
      for (const ad of Object.values(statusData)) statusMap[ad.id] = ad.status
    }
  }

  const convTypes = ['purchase', 'lead', 'complete_registration', 'offsite_conversion']

  return rows.map(r => ({
    campaignName: r.campaign_name,
    adSetName:    r.adset_name,
    adId:         r.ad_id,
    adName:       r.ad_name,
    status:       statusMap[r.ad_id] ?? 'UNKNOWN',
    impressions:  Number(r.impressions ?? 0),
    clicks:       Number(r.clicks ?? 0),
    ctr:          Number(r.ctr ?? 0) / 100,
    spend:        Number(r.spend ?? 0),
    reach:        Number(r.reach ?? 0),
    conversions:  sumActions(r.actions, convTypes),
  }))
}
