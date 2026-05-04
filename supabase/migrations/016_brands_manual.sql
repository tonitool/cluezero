-- Allow manually-added brands alongside sync-imported ones.
-- 'manual' platform value is used for brands added via Setup page (no real ad platform).

-- Extend the platform enum
alter type platform add value if not exists 'manual';

-- Add source column: 'sync' = auto-imported from data source, 'manual' = user-added
alter table tracked_brands
  add column if not exists source text not null default 'sync'
  check (source in ('sync', 'manual'));
