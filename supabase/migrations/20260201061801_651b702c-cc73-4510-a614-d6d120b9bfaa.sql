-- Funnel step counts (workspace-scoped)
BEGIN;

CREATE OR REPLACE FUNCTION public.get_funnel_step_counts(
  p_workspace_id uuid,
  p_steps text[]
)
RETURNS TABLE(
  step text,
  users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  IF p_steps IS NULL OR array_length(p_steps, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.step,
    COUNT(DISTINCT ae.user_id) AS users
  FROM unnest(p_steps) AS s(step)
  LEFT JOIN public.analytics_events ae
    ON ae.workspace_id = p_workspace_id
   AND ae.event_type = s.step
  GROUP BY s.step
  ORDER BY array_position(p_steps, s.step);
END;
$$;

REVOKE ALL ON FUNCTION public.get_funnel_step_counts(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_funnel_step_counts(uuid, text[]) TO authenticated;

COMMIT;