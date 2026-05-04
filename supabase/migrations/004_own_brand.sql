-- Add own_brand column to workspaces so users can specify their primary brand name
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS own_brand TEXT;
