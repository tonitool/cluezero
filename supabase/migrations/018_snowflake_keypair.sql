-- Add key-pair authentication columns to snowflake_connections
ALTER TABLE snowflake_connections
  ADD COLUMN IF NOT EXISTS private_key      text,
  ADD COLUMN IF NOT EXISTS private_key_pass text;

-- password is no longer required when using key-pair auth
ALTER TABLE snowflake_connections
  ALTER COLUMN password DROP NOT NULL;
