-- ============================================================
-- Migration 020: Agency / Client multitenancy
-- ============================================================

-- 1. Add 'client' to the workspace_member_role enum
ALTER TYPE workspace_member_role ADD VALUE IF NOT EXISTS 'client';

-- 2. Organizations table (represents an Agency account)
CREATE TABLE IF NOT EXISTS organizations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  slug                text        NOT NULL UNIQUE,
  owner_workspace_id  uuid        REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 3. Link workspaces to an organization and tag their type
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_type  text NOT NULL DEFAULT 'standalone';
  -- workspace_type values: 'standalone' | 'agency' | 'client'

-- Fast look-up of "all client workspaces owned by agency X"
CREATE INDEX IF NOT EXISTS workspaces_organization_id_idx
  ON workspaces(organization_id)
  WHERE organization_id IS NOT NULL;

-- 4. RLS: agency owner/admin can read their org row
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_by_agency_member" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = organizations.owner_workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );
