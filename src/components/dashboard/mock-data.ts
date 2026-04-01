export type ExecutiveMetric = {
  label: string
  value: string
  delta: string
  direction: "up" | "down"
}

export type WeeklyMovementMetric = {
  label: string
  value: string
  subtitle: string
  delta: string
  direction: "up" | "down"
}

export type Creative = {
  id: string
  brand: string
  title: string
  platform: "Meta" | "Google" | "LinkedIn"
  performanceIndex: number
  sentiment: number
  funnelStage: "See" | "Think" | "Do" | "Care"
  thumbnail: string
}

export const executiveMetrics: ExecutiveMetric[] = [
  {
    label: "Weekly est. market spend",
    value: "€36,410",
    delta: "+5.3% vs previous week",
    direction: "up",
  },
  {
    label: "% ORLEN share of weekly est. spend",
    value: "13.7%",
    delta: "+1.1 pts",
    direction: "up",
  },
  {
    label: "New ads this week (market)",
    value: "38",
    delta: "-7.4% vs previous week",
    direction: "down",
  },
  {
    label: "ORLEN new ads",
    value: "6",
    delta: "+20.0% vs previous week",
    direction: "up",
  },
]

export const weeklyMovementMetrics: WeeklyMovementMetric[] = [
  {
    label: "Total market weekly est. reach",
    value: "5,115,731",
    subtitle: "unique profiles",
    delta: "+2.4%",
    direction: "up",
  },
  {
    label: "Total market weekly est. spend",
    value: "€36,410",
    subtitle: "across active advertisers",
    delta: "+5.3%",
    direction: "up",
  },
  {
    label: "From new ads",
    value: "€4,643",
    subtitle: "12.7% of weekly movement",
    delta: "-1.9%",
    direction: "down",
  },
  {
    label: "From existing ads",
    value: "€31,767",
    subtitle: "87.3% of weekly movement",
    delta: "+6.1%",
    direction: "up",
  },
]

export const weeklySpendMovement = [
  { week: "02 Mar", orlen: 2100, aral: 6100, circleK: 3900, eni: 4200, esso: 7200, shell: 6800 },
  { week: "09 Mar", orlen: 1700, aral: 4300, circleK: 2800, eni: 3000, esso: 5300, shell: 4200 },
  { week: "16 Mar", orlen: 1800, aral: 4900, circleK: 2600, eni: 3100, esso: 5600, shell: 4500 },
  { week: "23 Mar", orlen: 2400, aral: 6300, circleK: 3500, eni: 3900, esso: 7600, shell: 6100 },
  { week: "30 Mar", orlen: 1200, aral: 2000, circleK: 1400, eni: 1700, esso: 2900, shell: 2400 },
]

export const spendShareTrend = [
  { week: "02 Mar", orlen: 8, aral: 45, circleK: 31, eni: 5, esso: 3, shell: 8 },
  { week: "09 Mar", orlen: 10, aral: 30, circleK: 29, eni: 6, esso: 11, shell: 14 },
  { week: "16 Mar", orlen: 13, aral: 20, circleK: 30, eni: 7, esso: 8, shell: 22 },
  { week: "23 Mar", orlen: 12, aral: 46, circleK: 18, eni: 5, esso: 7, shell: 12 },
  { week: "30 Mar", orlen: 14, aral: 8, circleK: 9, eni: 4, esso: 25, shell: 40 },
]

export const newVsExistingByAdvertiser = [
  { advertiser: "Aral", newAdsPct: 12, existingAdsPct: 88 },
  { advertiser: "Circle K", newAdsPct: 16, existingAdsPct: 84 },
  { advertiser: "ENI", newAdsPct: 9, existingAdsPct: 91 },
  { advertiser: "Esso", newAdsPct: 21, existingAdsPct: 79 },
  { advertiser: "Shell", newAdsPct: 13, existingAdsPct: 87 },
  { advertiser: "ORLEN", newAdsPct: 18, existingAdsPct: 82 },
]

export const weeklyMovementTable = [
  {
    advertiser: "Aral",
    platform: "META",
    totalAds: 623,
    newAds: 16,
    weeklyReach: 232082,
    weeklySpend: 16248,
    avgPi: 58.4,
  },
  {
    advertiser: "Circle K",
    platform: "META",
    totalAds: 319,
    newAds: 16,
    weeklyReach: 3779,
    weeklySpend: 2648,
    avgPi: 19.9,
  },
  {
    advertiser: "ENI",
    platform: "META",
    totalAds: 642,
    newAds: 9,
    weeklyReach: 584547,
    weeklySpend: 6842,
    avgPi: 56.5,
  },
  {
    advertiser: "Esso",
    platform: "META",
    totalAds: 699,
    newAds: 0,
    weeklyReach: 1180351,
    weeklySpend: 7725,
    avgPi: 60.2,
  },
  {
    advertiser: "Shell",
    platform: "META",
    totalAds: 402,
    newAds: 3,
    weeklyReach: 36585,
    weeklySpend: 2552,
    avgPi: 53,
  },
  {
    advertiser: "ORLEN",
    platform: "META",
    totalAds: 367,
    newAds: 6,
    weeklyReach: 713239,
    weeklySpend: 4923,
    avgPi: 61.6,
  },
]

export const newAdsTrend = [
  { week: "02 Mar", orlen: 13, aral: 40, eni: 25, esso: 12, shell: 18 },
  { week: "09 Mar", orlen: 22, aral: 17, eni: 42, esso: 16, shell: 14 },
  { week: "16 Mar", orlen: 9, aral: 8, eni: 19, esso: 10, shell: 13 },
  { week: "23 Mar", orlen: 12, aral: 21, eni: 16, esso: 8, shell: 11 },
  { week: "30 Mar", orlen: 6, aral: 5, eni: 8, esso: 4, shell: 7 },
]

export const performanceTrend = [
  { week: "02 Mar", orlen: 59.6, market: 54.1 },
  { week: "09 Mar", orlen: 59.1, market: 53.8 },
  { week: "16 Mar", orlen: 58.7, market: 53.2 },
  { week: "23 Mar", orlen: 58.9, market: 52.9 },
  { week: "30 Mar", orlen: 61.2, market: 49.1 },
]

export const platformDistributionByAdvertiser = [
  { advertiser: "Aral", meta: 73, google: 24, linkedin: 3 },
  { advertiser: "Circle K", meta: 88, google: 10, linkedin: 2 },
  { advertiser: "ENI", meta: 84, google: 14, linkedin: 2 },
  { advertiser: "Esso", meta: 93, google: 6, linkedin: 1 },
  { advertiser: "Shell", meta: 89, google: 9, linkedin: 2 },
  { advertiser: "ORLEN", meta: 82, google: 12, linkedin: 6 },
]

export const platformStrategyComparison = [
  { segment: "Market avg.", meta: 91, google: 7, linkedin: 2 },
  { segment: "ORLEN", meta: 84, google: 10, linkedin: 6 },
]

export const newAdsByAdvertiserPlatform = [
  { week: "02 Mar", orlenMeta: 9, orlenGoogle: 3, aralMeta: 26, aralGoogle: 10 },
  { week: "09 Mar", orlenMeta: 14, orlenGoogle: 8, aralMeta: 12, aralGoogle: 5 },
  { week: "16 Mar", orlenMeta: 6, orlenGoogle: 3, aralMeta: 5, aralGoogle: 3 },
  { week: "23 Mar", orlenMeta: 9, orlenGoogle: 3, aralMeta: 14, aralGoogle: 7 },
  { week: "30 Mar", orlenMeta: 4, orlenGoogle: 2, aralMeta: 3, aralGoogle: 2 },
]

export const performanceIndexRanking = [
  { advertiser: "Esso", score: 66 },
  { advertiser: "ORLEN", score: 61 },
  { advertiser: "ENI", score: 58 },
  { advertiser: "Aral", score: 54 },
  { advertiser: "Shell", score: 52 },
  { advertiser: "Circle K", score: 33 },
]

export const topicDistribution = [
  { topic: "Shop", totalAds: 1909 },
  { topic: "Existing", totalAds: 782 },
  { topic: "Laden", totalAds: 374 },
  { topic: "Stellenanzeigen", totalAds: 223 },
  { topic: "Waschen", totalAds: 111 },
]

export const topicByAdvertiser = [
  { advertiser: "Aral", shop: 49, existing: 32, laden: 13, stellenanzeigen: 4, waschen: 2 },
  { advertiser: "Circle K", shop: 51, existing: 28, laden: 16, stellenanzeigen: 3, waschen: 2 },
  { advertiser: "ENI", shop: 53, existing: 24, laden: 15, stellenanzeigen: 4, waschen: 4 },
  { advertiser: "Esso", shop: 64, existing: 23, laden: 8, stellenanzeigen: 3, waschen: 2 },
  { advertiser: "Shell", shop: 40, existing: 35, laden: 17, stellenanzeigen: 4, waschen: 4 },
  { advertiser: "ORLEN", shop: 56, existing: 29, laden: 10, stellenanzeigen: 3, waschen: 2 },
]

export const newAdsByTopic = [
  { week: "02 Mar", shop: 30, existing: 18, laden: 12, stellenanzeigen: 6, waschen: 4 },
  { week: "09 Mar", shop: 26, existing: 15, laden: 13, stellenanzeigen: 7, waschen: 5 },
  { week: "16 Mar", shop: 21, existing: 13, laden: 10, stellenanzeigen: 6, waschen: 4 },
  { week: "23 Mar", shop: 17, existing: 10, laden: 8, stellenanzeigen: 5, waschen: 3 },
  { week: "30 Mar", shop: 13, existing: 8, laden: 6, stellenanzeigen: 3, waschen: 2 },
]

export const funnelDistribution = [
  { stage: "See", value: 38 },
  { stage: "Think", value: 31 },
  { stage: "Do", value: 21 },
  { stage: "Care", value: 10 },
]

export const funnelByAdvertiser = [
  { advertiser: "Aral", see: 41, think: 30, doo: 20, care: 9 },
  { advertiser: "Circle K", see: 37, think: 35, doo: 20, care: 8 },
  { advertiser: "ENI", see: 33, think: 34, doo: 23, care: 10 },
  { advertiser: "Esso", see: 35, think: 29, doo: 27, care: 9 },
  { advertiser: "Shell", see: 40, think: 30, doo: 21, care: 9 },
  { advertiser: "ORLEN", see: 34, think: 33, doo: 24, care: 9 },
]

export const newAdsByFunnel = [
  { week: "02 Mar", see: 18, think: 15, doo: 11, care: 6 },
  { week: "09 Mar", see: 20, think: 17, doo: 12, care: 7 },
  { week: "16 Mar", see: 16, think: 14, doo: 10, care: 6 },
  { week: "23 Mar", see: 13, think: 12, doo: 9, care: 5 },
  { week: "30 Mar", see: 11, think: 10, doo: 8, care: 4 },
]

export const audienceMinAgeDistribution = [
  { bucket: "18", ads: 95 },
  { bucket: "21", ads: 210 },
  { bucket: "25", ads: 387 },
  { bucket: "30", ads: 448 },
  { bucket: "35", ads: 376 },
  { bucket: "40", ads: 240 },
]

export const audienceMaxAgeDistribution = [
  { bucket: "35", ads: 104 },
  { bucket: "45", ads: 263 },
  { bucket: "55", ads: 465 },
  { bucket: "65", ads: 512 },
  { bucket: "No max", ads: 289 },
]

export const audienceGenderDistribution = [
  { bucket: "All genders", ads: 1240 },
  { bucket: "Female", ads: 406 },
  { bucket: "Male", ads: 334 },
]

export const targetingLocationTop10 = [
  { location: "Warsaw", ads: 210 },
  { location: "Kraków", ads: 187 },
  { location: "Wrocław", ads: 165 },
  { location: "Poznań", ads: 152 },
  { location: "Gdańsk", ads: 143 },
  { location: "Łódź", ads: 134 },
  { location: "Silesia", ads: 127 },
  { location: "Szczecin", ads: 108 },
  { location: "Lublin", ads: 98 },
  { location: "Białystok", ads: 86 },
]

export const orlenVsMarketScorecards = [
  { label: "Total ads", orlen: 367, market: 537 },
  { label: "Performance index", orlen: 61.6, market: 53.9 },
  { label: "Top creative score", orlen: 83, market: 78 },
  { label: "Total est. reach (k)", orlen: 713, market: 408 },
]

export const competitorStrategyProfiles = [
  { advertiser: "ORLEN", awareness: 7, conversion: 8, innovation: 7, localTargeting: 8 },
  { advertiser: "Aral", awareness: 8, conversion: 6, innovation: 5, localTargeting: 6 },
  { advertiser: "ENI", awareness: 6, conversion: 7, innovation: 6, localTargeting: 7 },
  { advertiser: "Esso", awareness: 7, conversion: 8, innovation: 6, localTargeting: 5 },
  { advertiser: "Shell", awareness: 8, conversion: 6, innovation: 7, localTargeting: 6 },
  { advertiser: "Circle K", awareness: 5, conversion: 5, innovation: 6, localTargeting: 5 },
]

export const marketActivityVsPresence = [
  { advertiser: "ORLEN", activity: 62, presence: 14, reach: 713 },
  { advertiser: "Aral", activity: 54, presence: 17, reach: 232 },
  { advertiser: "ENI", activity: 58, presence: 11, reach: 584 },
  { advertiser: "Esso", activity: 66, presence: 19, reach: 1180 },
  { advertiser: "Shell", activity: 52, presence: 16, reach: 365 },
  { advertiser: "Circle K", activity: 33, presence: 10, reach: 38 },
]

export const topOpportunities = [
  { topic: "Car wash bundles", whitespace: "High", reason: "Low competitor density, high conversion intent", score: 5 },
  { topic: "EV charging loyalty", whitespace: "High", reason: "Market demand grows faster than ad volume", score: 5 },
  { topic: "SME fleet cards", whitespace: "Medium", reason: "Strong B2B CPC efficiency window", score: 4 },
  { topic: "Store meal combos", whitespace: "Medium", reason: "Competitors focus fuel-first messaging", score: 4 },
  { topic: "Seasonal driver safety", whitespace: "Medium", reason: "Engagement high with low weekly saturation", score: 4 },
  { topic: "Recruitment creatives", whitespace: "Medium", reason: "Lower spend pressure in funnel-care stage", score: 3 },
  { topic: "Route planner content", whitespace: "Low", reason: "Crowded awareness space", score: 2 },
  { topic: "Premium fuel benefits", whitespace: "Low", reason: "High competitor concentration", score: 2 },
  { topic: "Price-led tactical", whitespace: "Low", reason: "Short-lived spikes and high churn", score: 2 },
  { topic: "Generic station branding", whitespace: "Low", reason: "Low incremental performance lift", score: 1 },
]

export const creativeScorecards = [
  { label: "Avg. creative score", value: "79.2", delta: "+1.6" },
  { label: "Top creative score", value: "86", delta: "+3" },
  { label: "New high-performers", value: "10", delta: "+2" },
  { label: "Do-stage creative share", value: "21%", delta: "+1.2 pts" },
]

export const topCreatives: Creative[] = [
  {
    id: "1",
    brand: "Esso",
    title: "Weekend Fuel Saver with App Cashback",
    platform: "Meta",
    performanceIndex: 86,
    sentiment: 0.34,
    funnelStage: "Do",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "2",
    brand: "ORLEN",
    title: "Coffee + Car Wash Bundle in One Stop",
    platform: "Meta",
    performanceIndex: 83,
    sentiment: 0.58,
    funnelStage: "Think",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "3",
    brand: "Aral",
    title: "Collect Points Faster This Spring",
    platform: "Google",
    performanceIndex: 81,
    sentiment: 0.42,
    funnelStage: "Do",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "4",
    brand: "Shell",
    title: "Switch to EV Charging Membership",
    platform: "Meta",
    performanceIndex: 80,
    sentiment: 0.21,
    funnelStage: "Think",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "5",
    brand: "ENI",
    title: "Smart Fleet Offers for SMEs",
    platform: "LinkedIn",
    performanceIndex: 79,
    sentiment: 0.11,
    funnelStage: "See",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "6",
    brand: "ORLEN",
    title: "Retention Playbook for Loyalty Members",
    platform: "LinkedIn",
    performanceIndex: 78,
    sentiment: 0.47,
    funnelStage: "Care",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "7",
    brand: "Circle K",
    title: "Fresh Food Route Campaign",
    platform: "Meta",
    performanceIndex: 77,
    sentiment: 0.65,
    funnelStage: "See",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "8",
    brand: "Aral",
    title: "The New Mobility Service Stack",
    platform: "LinkedIn",
    performanceIndex: 76,
    sentiment: 0.37,
    funnelStage: "Think",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "9",
    brand: "Shell",
    title: "Prove Cost Efficiency Weekly",
    platform: "Google",
    performanceIndex: 75,
    sentiment: 0.28,
    funnelStage: "Do",
    thumbnail: "./placeholder.svg",
  },
  {
    id: "10",
    brand: "ENI",
    title: "Keep Existing Drivers Longer",
    platform: "Meta",
    performanceIndex: 74,
    sentiment: 0.19,
    funnelStage: "Care",
    thumbnail: "./placeholder.svg",
  },
]
