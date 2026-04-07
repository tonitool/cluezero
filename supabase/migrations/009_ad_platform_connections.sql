-- ─── Ad Platform Connections ─────────────────────────────────────────────────
-- Stores OAuth tokens for Google Ads and Meta Ads per workspace.
-- Each workspace can connect multiple ad accounts (e.g. multiple Meta accounts).

create table if not exists ad_platform_connections (
  id               uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references workspaces(id) on delete cascade,
  platform         text        not null check (platform in ('google_ads', 'meta_ads')),
  account_id       text        not null,  -- Google: customer_id, Meta: act_XXXXX
  account_name     text        not null default '',
  access_token     text        not null,
  refresh_token    text,                  -- Google has refresh; Meta long-lived tokens don't
  token_expires_at timestamptz,
  scopes           text        not null default '',
  connected_at     timestamptz not null default now(),
  last_used_at     timestamptz,
  status           text        not null default 'active' check (status in ('active', 'error', 'revoked')),
  error_message    text,

  unique (workspace_id, platform, account_id)
);

create index if not exists ad_platform_connections_workspace_idx
  on ad_platform_connections(workspace_id, platform);

-- RLS
alter table ad_platform_connections enable row level security;

create policy "workspace members can manage ad platform connections"
  on ad_platform_connections for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = ad_platform_connections.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
