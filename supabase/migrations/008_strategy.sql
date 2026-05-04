-- ─── Strategy Intelligence ───────────────────────────────────────────────────

-- Agent context stored per workspace (JSON object matching the UI fields)
alter table workspaces
  add column if not exists strategy_context jsonb;

-- Generated strategy briefs (one per agent run)
create table if not exists strategy_briefs (
  id             uuid        primary key default gen_random_uuid(),
  workspace_id   uuid        not null references workspaces(id) on delete cascade,
  week_label     text        not null,
  generated_at   timestamptz not null default now(),
  brief_json     jsonb       not null,
  rec_count      integer     not null default 0
);

create index if not exists strategy_briefs_workspace_time_idx
  on strategy_briefs(workspace_id, generated_at desc);

-- RLS
alter table strategy_briefs enable row level security;

create policy "workspace members can manage strategy briefs"
  on strategy_briefs for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = strategy_briefs.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
