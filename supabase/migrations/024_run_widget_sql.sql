-- ============================================================
-- Migration 024: run_widget_sql — sandboxed SQL runner for widgets
-- ============================================================
-- Called server-side (service role) only. Accepts pre-validated
-- SELECT SQL and executes it, returning rows as JSON.
-- The API layer enforces: SELECT-only, {{workspaceId}} substitution,
-- workspace membership check, and 500-row cap.

CREATE OR REPLACE FUNCTION run_widget_sql(
  p_workspace_id uuid,
  p_sql          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Extra guard: only SELECT statements accepted
  IF NOT (lower(trim(p_sql)) SIMILAR TO '(select|with)%') THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;

  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', p_sql)
    INTO v_result;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Only service role should call this function
REVOKE EXECUTE ON FUNCTION run_widget_sql(uuid, text) FROM PUBLIC;
