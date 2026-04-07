create table if not exists dashboard_tiles (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  title        text        not null default 'Untitled chart',
  metric_a     text        not null,
  metric_b     text,
  dimension    text        not null,
  chart_type   text        not null default 'bar',
  filters      jsonb       not null default '{}',
  week_range   int         not null default 4,
  position     int         not null default 0,
  col_span     int         not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table dashboard_tiles enable row level security;

create policy "workspace members can manage dashboard tiles"
  on dashboard_tiles for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = dashboard_tiles.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
