-- Workspace intelligence profile — used to give AI context about the client
alter table workspaces
  add column if not exists company_name        text,
  add column if not exists industry            text,
  add column if not exists website             text,
  add column if not exists brand_description   text,
  add column if not exists target_audience     text,
  add column if not exists ai_context          text;
