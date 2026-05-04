-- Add 'snowflake' as a valid platform value for brands synced from Snowflake connections.
-- Previously these were incorrectly labelled 'meta'.
alter type platform add value if not exists 'snowflake';

-- Migrate any existing rows that were incorrectly tagged as 'meta' but came from sync
-- (source = 'sync' means they were auto-imported, not from a real Meta ads account)
update tracked_brands
  set platform = 'snowflake'
  where platform = 'meta'
    and source = 'sync';
