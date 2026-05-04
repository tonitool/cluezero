-- Add brand_colors JSONB to workspaces
-- Stores a map of { "BrandName": "#hexcolor" } per workspace
-- e.g. { "ORLEN": "#E4002B", "Aral": "#0066B2", "Shell": "#FBCE07" }
alter table workspaces
  add column if not exists brand_colors jsonb not null default '{}'::jsonb;

-- Add delete policy for tracked_brands (was missing)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'tracked_brands'
      and policyname = 'tracked_brands_delete'
  ) then
    execute 'create policy "tracked_brands_delete" on tracked_brands
      for delete using (is_workspace_member(workspace_id))';
  end if;
end $$;
