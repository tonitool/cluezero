-- ============================================================
-- Migration 023: Workspace widget configurations
-- ============================================================
-- Stores per-workspace widget settings for the Intelligence tabs.
-- Built-in widgets: visibility + position overrides.
-- SQL widgets: full definition (query, chart type, title, size).

CREATE TABLE IF NOT EXISTS workspace_widget_configs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tab          text        NOT NULL,   -- 'overview' | 'movement' | 'competitive' | 'performance' | 'brand' | 'creative'
  widget_id    text        NOT NULL,   -- built-in key OR uuid for SQL widgets
  type         text        NOT NULL DEFAULT 'builtin', -- 'builtin' | 'sql'
  title        text,
  -- SQL widget fields
  sql_query    text,
  chart_type   text,                   -- 'table' | 'kpi' | 'bar' | 'line' | 'area' | 'pie'
  col_span     integer     NOT NULL DEFAULT 1, -- 1 = half-width, 2 = full-width
  -- Layout
  position     integer     NOT NULL DEFAULT 999,
  is_visible   boolean     NOT NULL DEFAULT true,
  -- Meta
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, tab, widget_id)
);

ALTER TABLE workspace_widget_configs ENABLE ROW LEVEL SECURITY;

-- Members can read widget configs for their workspace
CREATE POLICY "widget_configs_select" ON workspace_widget_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspace_widget_configs.workspace_id
        AND user_id = auth.uid()
    )
  );

-- Only owner/admin can insert/update/delete
CREATE POLICY "widget_configs_write" ON workspace_widget_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspace_widget_configs.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS widget_configs_workspace_tab_idx
  ON workspace_widget_configs (workspace_id, tab, position);
