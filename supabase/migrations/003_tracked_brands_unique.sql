-- Add unique constraint so tracked_brands upserts work correctly
ALTER TABLE tracked_brands
  ADD CONSTRAINT tracked_brands_workspace_name_platform_key
  UNIQUE (workspace_id, name, platform);
