-- ============================================================
-- Migration 005: Support multiple Snowflake connections per workspace
-- ============================================================

-- Allow multiple connections per workspace (drop the unique constraint)
alter table snowflake_connections drop constraint if exists snowflake_connections_workspace_id_key;

-- Add a human-readable name for each connection (e.g. "Germany", "Poland")
alter table snowflake_connections add column if not exists connection_name text;

-- Tag each ad with which connection it came from so we can filter by source
alter table ads add column if not exists connection_id uuid references snowflake_connections(id) on delete set null;

-- Index for fast filtering
create index if not exists ads_connection_id_idx on ads(connection_id);
