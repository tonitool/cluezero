-- Agent runs: log every autonomous agent execution
create table if not exists agent_runs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  agent_type    text not null default 'competitive_watch',
  status        text not null default 'running',  -- running | completed | failed
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  summary       text,
  findings      jsonb,   -- array of { title, detail, severity: 'high'|'medium'|'low', brand? }
  actions_taken jsonb,   -- array of { type: 'slack'|'email'|'asana'|'notion', status, detail }
  error         text,
  created_at    timestamptz not null default now()
);

-- Agent schedules: per-workspace configuration for the watch agent
create table if not exists agent_schedules (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade unique,
  enabled             boolean not null default false,
  run_day             text not null default 'monday',  -- monday|tuesday|...|sunday|daily
  run_hour            int  not null default 7,          -- 0–23 UTC
  last_run_at         timestamptz,
  slack_webhook_url   text,
  notify_email        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- RLS
alter table agent_runs      enable row level security;
alter table agent_schedules enable row level security;

create policy "workspace members can read agent_runs"
  on agent_runs for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = agent_runs.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can read agent_schedules"
  on agent_schedules for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = agent_schedules.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace admins can update agent_schedules"
  on agent_schedules for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = agent_schedules.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin')
    )
  );

create index if not exists agent_runs_workspace_id_idx on agent_runs(workspace_id);
create index if not exists agent_runs_started_at_idx   on agent_runs(started_at desc);
