ALTER TABLE snowflake_connections
  ADD COLUMN IF NOT EXISTS sync_progress integer,
  ADD COLUMN IF NOT EXISTS sync_total    integer;
