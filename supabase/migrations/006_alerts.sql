-- Alert rules per workspace
create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  condition_type text not null,
  threshold numeric not null default 20,
  brand text,
  enabled boolean not null default true,
  last_triggered_at timestamptz,
  trigger_count integer not null default 0,
  created_at timestamptz default now()
);

-- Triggered alert events
create table if not exists alert_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  rule_id uuid references alert_rules(id) on delete set null,
  rule_name text not null,
  message text not null,
  severity text not null default 'info',
  read boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists alert_rules_workspace_idx on alert_rules(workspace_id);
create index if not exists alert_events_workspace_idx on alert_events(workspace_id, created_at desc);
