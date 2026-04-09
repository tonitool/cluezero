-- ============================================================
-- Migration 022: CDN thumbnail archival support
-- ============================================================
-- Adds:
--   ads.cdn_thumbnail_url        — Bunny.net CDN URL after archival
--   snowflake_connections.col_thumbnail — optional column mapping for image URLs

ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS cdn_thumbnail_url text;

ALTER TABLE snowflake_connections
  ADD COLUMN IF NOT EXISTS col_thumbnail text;

-- Index for finding un-archived ads efficiently
CREATE INDEX IF NOT EXISTS ads_cdn_thumbnail_null_idx
  ON ads (workspace_id)
  WHERE thumbnail_url IS NOT NULL AND cdn_thumbnail_url IS NULL;
