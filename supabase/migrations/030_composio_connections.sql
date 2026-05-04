-- Generic Composio-backed connections table
-- Replaces snowflake_connections with an app-agnostic connector system
-- Supports any Composio app: Snowflake, Google Sheets, Airtable, HubSpot, etc.

create table if not exists connections (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,

  -- Display
  name                  text not null,                    -- user-given name e.g. "Prod Snowflake"
  app_name              text not null,                    -- composio app key: 'snowflake', 'googlesheets'
  logo_url              text,                             -- cached from Composio

  -- Composio
  composio_entity_id    text not null,                    -- = workspace_id (our entity key in Composio)
  composio_connection_id text,                           -- Composio connectedAccountId once active

  -- Status
  status                text not null default 'pending'   -- pending | active | error | disconnected
    check (status in ('pending','active','error','disconnected')),

  -- Column mapping config (JSON) — same shape as old snowflake_connections col_* fields
  config                jsonb not null default '{}',

  -- Sync state (mirrors old snowflake_connections sync fields)
  last_sync_at          timestamptz,
  last_sync_rows        int,
  sync_status           text not null default 'idle'
    check (sync_status in ('idle','syncing','error')),
  sync_progress         int,
  sync_total            int,
  sync_error            text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_connections_workspace on connections(workspace_id);
create index if not exists idx_connections_status    on connections(workspace_id, status);

-- RLS
alter table connections enable row level security;

create policy "Members can read connections"
  on connections for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = connections.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage connections"
  on connections for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = connections.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin')
    )
  );
