import type { Platform, CreativeType } from '@/types/database'

// Base CPM in EUR by platform (EU market averages — update quarterly)
const BASE_CPM: Record<Platform, number> = {
  meta: 8.5,
  google: 12.0,
  linkedin: 28.0,
}

// Creative format multiplier (video/carousel command higher CPMs)
const FORMAT_MULTIPLIER: Record<CreativeType, number> = {
  video: 1.4,
  carousel: 1.2,
  image: 1.0,
}

interface ImpressionsRange {
  lower_bound: number
  upper_bound: number
}

/**
 * Parse Meta's impression range string or object into a midpoint number.
 * Meta returns ranges like "1000-4999" or { lower_bound: 1000, upper_bound: 4999 }
 */
function parseImpressions(raw: string | ImpressionsRange | number | null): number {
  if (!raw) return 0
  if (typeof raw === 'number') return raw

  if (typeof raw === 'object') {
    return Math.round((raw.lower_bound + raw.upper_bound) / 2)
  }

  // String form: "1000-4999" or "< 1000" or "> 10000"
  if (raw.startsWith('<')) return 500
  if (raw.startsWith('>')) return parseInt(raw.replace(/\D/g, '')) * 1.5
  const parts = raw.split('-').map(Number)
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return Math.round((parts[0] + parts[1]) / 2)
  }

  return parseInt(raw.replace(/\D/g, '')) || 0
}

export interface SpendEstimate {
  est_impressions: number
  est_reach: number
  est_spend_eur: number
  estimation_method: string
}

export function estimateSpend(params: {
  platform: Platform
  creative_type: CreativeType
  impressions_raw: string | ImpressionsRange | number | null
  days_running?: number
}): SpendEstimate {
  const { platform, creative_type, impressions_raw, days_running = 7 } = params

  const est_impressions = parseImpressions(impressions_raw)

  // Reach is typically 60-80% of impressions (frequency > 1)
  const est_reach = Math.round(est_impressions * 0.7)

  const est_spend_eur = parseFloat(
    ((est_impressions / 1000) * BASE_CPM[platform] * FORMAT_MULTIPLIER[creative_type]).toFixed(2)
  )

  return {
    est_impressions,
    est_reach,
    est_spend_eur,
    estimation_method: `v1:cpm=${BASE_CPM[platform]},fmt=${FORMAT_MULTIPLIER[creative_type]},days=${days_running}`,
  }
}
