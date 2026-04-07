-- ============================================================
-- Migration 013: Named dashboards + canvas state
-- ============================================================

-- Multiple named dashboards per workspace
create table if not exists dashboards (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  name         text        not null default 'My Dashboard',
  position     int         not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table dashboards enable row level security;

create policy "workspace members can manage dashboards"
  on dashboards for all
  using (is_workspace_member(workspace_id));

-- Link existing tiles to a named dashboard
alter table dashboard_tiles
  add column if not exists dashboard_id uuid references dashboards(id) on delete cascade;

-- Canvas state (one saved canvas per workspace for now)
create table if not exists canvas_states (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  nodes        jsonb       not null default '[]',
  edges        jsonb       not null default '[]',
  updated_at   timestamptz not null default now(),
  unique(workspace_id)
);

alter table canvas_states enable row level security;

create policy "workspace members can manage canvas"
  on canvas_states for all
  using (is_workspace_member(workspace_id));
