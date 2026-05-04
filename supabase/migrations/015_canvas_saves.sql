-- Named canvas saves (multiple snapshots per workspace)
create table if not exists canvas_saves (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  name         text        not null,
  nodes        jsonb       not null default '[]',
  edges        jsonb       not null default '[]',
  created_at   timestamptz not null default now()
);

alter table canvas_saves enable row level security;

create policy "workspace members can manage canvas saves"
  on canvas_saves for all
  using (is_workspace_member(workspace_id));
