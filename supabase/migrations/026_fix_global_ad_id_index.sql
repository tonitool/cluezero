-- ============================================================
-- Migration 026: Fix global_ad_id index
--
-- Migration 025 created a UNIQUE index on (workspace_id, global_ad_id).
-- This causes "ON CONFLICT DO UPDATE command cannot affect row a second time"
-- when a single upsert batch contains two rows with different ad_ids but
-- the same global_ad_id — both would try to UPDATE the same existing row
-- via two different constraints (primary = workspace_id,platform,ad_id;
-- secondary = workspace_id,global_ad_id), which Postgres refuses.
--
-- global_ad_id is a reference column only (for ML / cross-reference use).
-- It does not need to be a uniqueness key in our system. Replace it with
-- a plain (non-unique) index for lookup performance only.
-- ============================================================

-- Drop the problematic unique index
DROP INDEX IF EXISTS idx_ads_workspace_global_ad_id;

-- Replace with a regular (non-unique) index
CREATE INDEX IF NOT EXISTS idx_ads_global_ad_id_lookup
  ON ads (workspace_id, global_ad_id)
  WHERE global_ad_id IS NOT NULL;
