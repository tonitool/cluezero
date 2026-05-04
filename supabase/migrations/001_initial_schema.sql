-- ============================================================
-- Competitive Intelligence Ad Tracker — Initial Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type platform as enum ('meta', 'google', 'linkedin');
create type funnel_stage as enum ('See', 'Think', 'Do', 'Care');
create type creative_type as enum ('image', 'video', 'carousel');
create type workspace_member_role as enum ('owner', 'admin', 'viewer');

-- ============================================================
-- WORKSPACES  (one per client/team)
-- ============================================================
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- WORKSPACE MEMBERS  (maps Supabase auth users → workspaces)
-- ============================================================
create table workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          workspace_member_role not null default 'viewer',
  created_at    timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- ============================================================
-- TRACKED BRANDS  (competitors + own brand per workspace)
-- ============================================================
create table tracked_brands (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  name              text not null,
  platform          platform not null,
  platform_page_id  text,           -- Meta page ID / Google advertiser ID etc.
  is_own_brand      boolean not null default false,
  color             text,           -- Hex color for charts e.g. "#E4002B"
  created_at        timestamptz not null default now()
);

-- ============================================================
-- ADS  (raw ingested creatives from all platforms)
-- ============================================================
create table ads (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  brand_id       uuid not null references tracked_brands(id) on delete cascade,
  platform       platform not null,
  ad_id          text not null,     -- Native platform ad ID
  creative_type  creative_type not null default 'image',
  headline       text,
  body           text,
  cta            text,
  thumbnail_url  text,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz,
  is_active      boolean not null default true,
  raw_payload    jsonb,             -- Full API response for reference
  created_at     timestamptz not null default now(),
  unique(workspace_id, platform, ad_id)
);

-- ============================================================
-- AD ENRICHMENTS  (AI-generated scores, runs async after ingest)
-- ============================================================
create table ad_enrichments (
  ad_id           uuid primary key references ads(id) on delete cascade,
  sentiment_score numeric(4,3),     -- -1.000 to +1.000
  funnel_stage    funnel_stage,
  topics          text[],           -- e.g. {"price", "loyalty", "sustainability"}
  enriched_at     timestamptz not null default now()
);

-- ============================================================
-- AD SPEND ESTIMATES  (computed weekly per ad)
-- ============================================================
create table ad_spend_estimates (
  id                  uuid primary key default gen_random_uuid(),
  ad_id               uuid not null references ads(id) on delete cascade,
  week_start          date not null,  -- ISO week Monday
  est_impressions     bigint,
  est_reach           bigint,
  est_spend_eur       numeric(12,2),
  estimation_method   text default 'v1', -- version for auditability
  unique(ad_id, week_start)
);

-- ============================================================
-- WEEKLY METRICS  (pre-aggregated for fast dashboard queries)
-- ============================================================
create table weekly_metrics (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  week_start              date not null,
  brand_id                uuid not null references tracked_brands(id) on delete cascade,
  platform                platform not null,
  total_ads               integer not null default 0,
  new_ads                 integer not null default 0,
  active_ads              integer not null default 0,
  est_spend_eur           numeric(12,2) not null default 0,
  est_reach               bigint not null default 0,
  avg_sentiment           numeric(4,3),
  avg_performance_index   numeric(5,2),  -- 0-100 custom score
  funnel_breakdown        jsonb,         -- {"See": 12, "Think": 8, "Do": 5, "Care": 2}
  unique(workspace_id, week_start, brand_id, platform)
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table tracked_brands    enable row level security;
alter table ads               enable row level security;
alter table ad_enrichments    enable row level security;
alter table ad_spend_estimates enable row level security;
alter table weekly_metrics    enable row level security;

-- Helper: check if current user is a member of a workspace
create or replace function is_workspace_member(ws_id uuid)
returns boolean as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$ language sql security definer;

-- Workspaces: members can read their own workspaces
create policy "workspace_select" on workspaces
  for select using (is_workspace_member(id));

-- Workspaces: any authenticated user can create a workspace
create policy "workspace_insert" on workspaces
  for insert with check (auth.uid() is not null);

-- Workspaces: members can update their own workspace
create policy "workspace_update" on workspaces
  for update using (is_workspace_member(id));

-- Workspace members: users see their own memberships
create policy "workspace_members_select" on workspace_members
  for select using (user_id = auth.uid());

-- Workspace members: owners can insert new members
create policy "workspace_members_insert" on workspace_members
  for insert with check (
    exists (
      select 1 from workspace_members
      where workspace_id = workspace_members.workspace_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- Tracked brands, ads, enrichments, estimates, metrics: workspace members only
create policy "tracked_brands_select" on tracked_brands
  for select using (is_workspace_member(workspace_id));

create policy "tracked_brands_insert" on tracked_brands
  for insert with check (is_workspace_member(workspace_id));

create policy "tracked_brands_update" on tracked_brands
  for update using (is_workspace_member(workspace_id));

create policy "ads_select" on ads
  for select using (is_workspace_member(workspace_id));

create policy "ads_insert" on ads
  for insert with check (is_workspace_member(workspace_id));

create policy "ads_update" on ads
  for update using (is_workspace_member(workspace_id));

create policy "ad_enrichments_select" on ad_enrichments
  for select using (
    exists (select 1 from ads where ads.id = ad_enrichments.ad_id and is_workspace_member(ads.workspace_id))
  );

create policy "ad_enrichments_upsert" on ad_enrichments
  for all using (
    exists (select 1 from ads where ads.id = ad_enrichments.ad_id and is_workspace_member(ads.workspace_id))
  );

create policy "ad_spend_estimates_select" on ad_spend_estimates
  for select using (
    exists (select 1 from ads where ads.id = ad_spend_estimates.ad_id and is_workspace_member(ads.workspace_id))
  );

create policy "ad_spend_estimates_upsert" on ad_spend_estimates
  for all using (
    exists (select 1 from ads where ads.id = ad_spend_estimates.ad_id and is_workspace_member(ads.workspace_id))
  );

create policy "weekly_metrics_select" on weekly_metrics
  for select using (is_workspace_member(workspace_id));

create policy "weekly_metrics_upsert" on weekly_metrics
  for all using (is_workspace_member(workspace_id));

-- ============================================================
-- INDEXES  (query performance)
-- ============================================================
create index ads_workspace_brand_idx on ads(workspace_id, brand_id);
create index ads_platform_idx on ads(platform);
create index ads_first_seen_idx on ads(first_seen_at desc);
create index ad_enrichments_funnel_idx on ad_enrichments(funnel_stage);
create index weekly_metrics_week_idx on weekly_metrics(workspace_id, week_start desc);
create index weekly_metrics_brand_idx on weekly_metrics(brand_id);

-- ============================================================
-- FUNCTION: aggregate weekly metrics  (call after each ingest run)
-- ============================================================
create or replace function refresh_weekly_metrics(ws_id uuid, week date)
returns void as $$
begin
  insert into weekly_metrics (
    workspace_id, week_start, brand_id, platform,
    total_ads, new_ads, active_ads,
    est_spend_eur, est_reach,
    avg_sentiment, avg_performance_index,
    funnel_breakdown
  )
  select
    a.workspace_id,
    week,
    a.brand_id,
    a.platform,
    count(*)                                             as total_ads,
    count(*) filter (where a.first_seen_at >= week
                       and a.first_seen_at < week + 7)  as new_ads,
    count(*) filter (where a.is_active)                 as active_ads,
    coalesce(sum(ase.est_spend_eur), 0)                 as est_spend_eur,
    coalesce(sum(ase.est_reach), 0)                     as est_reach,
    avg(ae.sentiment_score)                             as avg_sentiment,
    null                                                as avg_performance_index,
    jsonb_build_object(
      'See',  count(*) filter (where ae.funnel_stage = 'See'),
      'Think', count(*) filter (where ae.funnel_stage = 'Think'),
      'Do',   count(*) filter (where ae.funnel_stage = 'Do'),
      'Care', count(*) filter (where ae.funnel_stage = 'Care')
    )                                                   as funnel_breakdown
  from ads a
  left join ad_enrichments ae on ae.ad_id = a.id
  left join ad_spend_estimates ase on ase.ad_id = a.id and ase.week_start = week
  where a.workspace_id = ws_id
  group by a.workspace_id, a.brand_id, a.platform
  on conflict (workspace_id, week_start, brand_id, platform)
  do update set
    total_ads               = excluded.total_ads,
    new_ads                 = excluded.new_ads,
    active_ads              = excluded.active_ads,
    est_spend_eur           = excluded.est_spend_eur,
    est_reach               = excluded.est_reach,
    avg_sentiment           = excluded.avg_sentiment,
    funnel_breakdown        = excluded.funnel_breakdown;
end;
$$ language plpgsql security definer;
