-- Brand alias / normalization system
-- Maps raw brand names from data sources to canonical names, with optional exclusion.

create table if not exists brand_aliases (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  raw_name    text not null,
  canonical_name text not null,
  is_excluded boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (workspace_id, raw_name)
);

-- RLS
alter table brand_aliases enable row level security;

create policy "members can read aliases"
  on brand_aliases for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = brand_aliases.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "members can manage aliases"
  on brand_aliases for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = brand_aliases.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Index for fast lookups during data queries
create index idx_brand_aliases_workspace on brand_aliases(workspace_id);
