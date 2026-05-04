-- 031_dashboard_kpi_columns.sql
-- Add columns needed for the full Looker Studio dashboard parity

-- ── ads table: add missing fields ─────────────────────────────────────────────

ALTER TABLE ads ADD COLUMN IF NOT EXISTS global_ad_id TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS source_platform TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS format_type TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS creative_score NUMERIC;

-- Index for opportunity scoring
CREATE INDEX IF NOT EXISTS idx_ads_global_ad_id ON ads(global_ad_id) WHERE global_ad_id IS NOT NULL;

-- ── ad_enrichments: add audience and targeting fields ─────────────────────────

ALTER TABLE ad_enrichments ADD COLUMN IF NOT EXISTS min_age INTEGER;
ALTER TABLE ad_enrichments ADD COLUMN IF NOT EXISTS max_age INTEGER;
ALTER TABLE ad_enrichments ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE ad_enrichments ADD COLUMN IF NOT EXISTS target_country TEXT;
ALTER TABLE ad_enrichments ADD COLUMN IF NOT EXISTS topic TEXT;

-- ── ad_spend_estimates: add is_new_ad flag for new vs existing spend split ────

ALTER TABLE ad_spend_estimates ADD COLUMN IF NOT EXISTS is_new_ad BOOLEAN DEFAULT false;

-- ── weekly_metrics: add missing columns ───────────────────────────────────────

ALTER TABLE weekly_metrics ADD COLUMN IF NOT EXISTS est_spend_new NUMERIC;
ALTER TABLE weekly_metrics ADD COLUMN IF NOT EXISTS est_spend_existing NUMERIC;
ALTER TABLE weekly_metrics ADD COLUMN IF NOT EXISTS est_reach_new NUMERIC;
ALTER TABLE weekly_metrics ADD COLUMN IF NOT EXISTS est_reach_existing NUMERIC;
