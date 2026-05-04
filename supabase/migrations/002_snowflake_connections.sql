-- ============================================================
-- Migration 002: Snowflake connection config per workspace
-- ============================================================

create table snowflake_connections (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  -- credentials
  account         text not null,
  username        text not null,
  password        text not null,
  role            text,
  warehouse       text not null,
  database        text not null,
  schema          text not null,
  -- column mapping
  table_name      text not null,
  col_brand       text not null,
  col_date        text not null,
  col_headline    text,
  col_spend       text,
  col_impressions text,
  col_reach       text,
  col_pi          text,
  col_funnel      text,
  col_topic       text,
  -- sync metadata
  last_synced_at  timestamptz,
  last_sync_rows  integer,
  sync_status     text not null default 'idle',  -- idle | syncing | error
  sync_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(workspace_id)
);

alter table snowflake_connections enable row level security;

create policy "sf_connections_select" on snowflake_connections
  for select using (is_workspace_member(workspace_id));

create policy "sf_connections_insert" on snowflake_connections
  for insert with check (is_workspace_member(workspace_id));

create policy "sf_connections_update" on snowflake_connections
  for update using (is_workspace_member(workspace_id));

create policy "sf_connections_delete" on snowflake_connections
  for delete using (is_workspace_member(workspace_id));

-- Add performance_index column to ads (Snowflake source may provide this)
alter table ads add column if not exists performance_index numeric(5,2);
alter table ads add column if not exists topic text;
