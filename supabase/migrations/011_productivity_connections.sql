-- productivity_connections: stores Asana and ClickUp integration credentials
-- Each workspace can have one connection per platform

create table if not exists productivity_connections (
  id                uuid        primary key default gen_random_uuid(),
  workspace_id      uuid        not null references workspaces(id) on delete cascade,
  platform          text        not null,  -- 'asana' | 'clickup'
  account_name      text,                  -- display name (Asana workspace name, ClickUp user name)
  access_token      text        not null,
  refresh_token     text,                  -- Asana only (OAuth refresh token)
  token_expires_at  timestamptz,           -- Asana only
  config            jsonb       not null default '{}',
  -- Asana config: { workspace_gid, workspace_name, project_gid, project_name }
  -- ClickUp config: { team_id, team_name, space_id, space_name, list_id, list_name }
  status            text        not null default 'active',  -- 'active' | 'error'
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (workspace_id, platform)
);

alter table productivity_connections enable row level security;

-- Workspace members can view connections for their workspace
create policy "workspace members can view productivity connections"
  on productivity_connections for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = productivity_connections.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
