-- ============================================================
-- Migration 025: Snowflake ad field extensions
--
-- Adds fields to properly capture global_ad_id (Snowflake's
-- true unique ad identifier), source_platform (META/GOOGLE/
-- LINKEDIN), is_active flag, and format_type from Snowflake.
-- Also adds the corresponding column mapping fields to
-- snowflake_connections so users can wire these up in the UI.
-- ============================================================

-- 1. New optional column-mapping fields on snowflake_connections
ALTER TABLE snowflake_connections
  ADD COLUMN IF NOT EXISTS col_ad_id       text,   -- maps to global_ad_id
  ADD COLUMN IF NOT EXISTS col_platform    text,   -- maps to source_platform
  ADD COLUMN IF NOT EXISTS col_is_active   text,   -- maps to is_active
  ADD COLUMN IF NOT EXISTS col_format      text;   -- maps to format_type_normalized

-- 2. Store the Snowflake global_ad_id alongside our internal ad_id
--    so we can cross-reference with Snowflake views (e.g. for ML).
ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS global_ad_id    text,
  ADD COLUMN IF NOT EXISTS source_platform text,   -- META | GOOGLE | LINKEDIN
  ADD COLUMN IF NOT EXISTS format_type     text;   -- image | video | carousel | …

-- Index for fast lookup by global_ad_id within a workspace
CREATE INDEX IF NOT EXISTS idx_ads_global_ad_id
  ON ads (workspace_id, global_ad_id)
  WHERE global_ad_id IS NOT NULL;

-- 3. When col_ad_id is configured we use global_ad_id as the
--    upsert key, so add a unique constraint for that path.
--    (workspace_id, global_ad_id) must be unique when present.
--    We use a partial unique index to avoid conflicts with rows
--    that have NULL global_ad_id (legacy synthetic-id rows).
CREATE UNIQUE INDEX IF NOT EXISTS idx_ads_workspace_global_ad_id
  ON ads (workspace_id, global_ad_id)
  WHERE global_ad_id IS NOT NULL;
