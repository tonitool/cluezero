-- Value Transform Rules
-- Enables users to customize how Snowflake data is displayed:
--   mapping    → remap raw field values (e.g. "TOFU" → "Top of Funnel")
--   format     → number formatting (prefix, suffix, decimals, scale)
--   scale      → multiply by factor (e.g. cents → dollars)
--   threshold  → colour-code ranges (e.g. PI > 70 = green)
--   field_label→ rename a column heading for display

create table if not exists value_transform_rules (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  field        text not null,            -- target field: funnel_stage, spend, pi, topic, platform, etc.
  rule_type    text not null check (rule_type in ('mapping', 'format', 'scale', 'threshold', 'field_label')),
  config       jsonb not null default '{}',
  priority     int not null default 0,   -- higher = applied later (overrides lower)
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_vtr_workspace on value_transform_rules(workspace_id);
create index if not exists idx_vtr_field     on value_transform_rules(workspace_id, field);

-- RLS
alter table value_transform_rules enable row level security;

create policy "Members can read transform rules"
  on value_transform_rules for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = value_transform_rules.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage transform rules"
  on value_transform_rules for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = value_transform_rules.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin')
    )
  );
