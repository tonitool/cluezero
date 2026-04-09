-- ============================================================
-- Migration 021: Workspace invite tokens
-- ============================================================
-- Allows agency users to generate invite links for clients.
-- When a client opens the link they sign up / log in and are
-- automatically added to the workspace with the specified role.

CREATE TABLE IF NOT EXISTS workspace_invites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token        text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  role         text        NOT NULL DEFAULT 'client',   -- role granted on acceptance
  email        text,                                     -- optional: lock to a specific email
  invited_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '30 days',
  used_at      timestamptz,
  used_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Agency members can read invites for their own workspaces
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_select_by_workspace_member" ON workspace_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_invites.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Only service role (server-side API) may insert / update invites
