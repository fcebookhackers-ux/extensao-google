BEGIN;

-- Ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace_created_at
  ON public.analytics_events (workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace_event_created_at
  ON public.analytics_events (workspace_id, event_type, created_at DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
  ON public.analytics_events (session_id)
  WHERE session_id IS NOT NULL;

-- Workspace-scoped tracking (keep signature)
CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_type text,
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL,
  p_automation_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS void
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

  INSERT INTO public.analytics_events (
    user_id,
    workspace_id,
    event_type,
    event_properties,
    session_id,
    automation_id,
    contact_id
  )
  VALUES (
    v_user_id,
    p_workspace_id,
    p_event_type,
    COALESCE(p_properties, '{}'::jsonb),
    p_session_id,
    p_automation_id,
    p_contact_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.track_analytics_event(text, jsonb, text, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_analytics_event(text, jsonb, text, uuid, uuid, uuid) TO authenticated;

-- KPIs (keep signature)
CREATE OR REPLACE FUNCTION public.get_product_kpis(
  p_workspace_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  dau bigint,
  wau bigint,
  mau bigint,
  ttfv_avg_minutes numeric,
  ttfv_median_minutes numeric,
  window_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_now timestamptz := now();
  v_from timestamptz;
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

  window_days := GREATEST(1, COALESCE(p_days, 30));
  v_from := v_now - make_interval(days => window_days);

  SELECT COUNT(DISTINCT ae.user_id)
    INTO dau
  FROM public.analytics_events ae
  WHERE ae.workspace_id = p_workspace_id
    AND ae.created_at >= (v_now - interval '1 day');

  SELECT COUNT(DISTINCT ae.user_id)
    INTO wau
  FROM public.analytics_events ae
  WHERE ae.workspace_id = p_workspace_id
    AND ae.created_at >= (v_now - interval '7 days');

  SELECT COUNT(DISTINCT ae.user_id)
    INTO mau
  FROM public.analytics_events ae
  WHERE ae.workspace_id = p_workspace_id
    AND ae.created_at >= (v_now - interval '30 days');

  WITH first_any AS (
    SELECT user_id, MIN(created_at) AS first_event_at
    FROM public.analytics_events
    WHERE workspace_id = p_workspace_id
      AND created_at >= v_from
    GROUP BY user_id
  ),
  first_value AS (
    SELECT user_id, MIN(created_at) AS first_value_at
    FROM public.analytics_events
    WHERE workspace_id = p_workspace_id
      AND created_at >= v_from
      AND event_type IN ('automation.created', 'automation_created')
    GROUP BY user_id
  ),
  diffs AS (
    SELECT
      a.user_id,
      EXTRACT(EPOCH FROM (v.first_value_at - a.first_event_at)) / 60.0 AS minutes
    FROM first_any a
    JOIN first_value v ON v.user_id = a.user_id
    WHERE v.first_value_at >= a.first_event_at
  )
  SELECT
    COALESCE(AVG(minutes), 0),
    COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes), 0)
  INTO ttfv_avg_minutes, ttfv_median_minutes
  FROM diffs;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_kpis(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_kpis(uuid, integer) TO authenticated;

-- Retention cohorts: must DROP first (parameter-name change not allowed in CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.get_retention_cohorts(uuid, integer);

CREATE FUNCTION public.get_retention_cohorts(
  p_workspace_id uuid,
  p_lookback_days integer DEFAULT 60
)
RETURNS TABLE(
  cohort_date date,
  cohort_size bigint,
  retained_d1 bigint,
  retained_d7 bigint,
  retained_d30 bigint,
  retention_d1_pct numeric,
  retention_d7_pct numeric,
  retention_d30_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_days integer;
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

  v_days := GREATEST(1, COALESCE(p_lookback_days, 60));

  RETURN QUERY
  WITH cohort AS (
    SELECT
      user_id,
      MIN(created_at)::date AS cohort_date
    FROM public.analytics_events
    WHERE workspace_id = p_workspace_id
    GROUP BY user_id
  ),
  cohort_filtered AS (
    SELECT *
    FROM cohort
    WHERE cohort_date BETWEEN (current_date - v_days) AND current_date
  ),
  activity AS (
    SELECT ae.user_id, ae.created_at::date AS activity_date
    FROM public.analytics_events ae
    WHERE ae.workspace_id = p_workspace_id
  )
  SELECT
    c.cohort_date,
    COUNT(DISTINCT c.user_id) AS cohort_size,
    COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 1 THEN c.user_id END) AS retained_d1,
    COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 7 THEN c.user_id END) AS retained_d7,
    COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 30 THEN c.user_id END) AS retained_d30,
    (COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 1 THEN c.user_id END)::numeric
      / NULLIF(COUNT(DISTINCT c.user_id), 0)) * 100 AS retention_d1_pct,
    (COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 7 THEN c.user_id END)::numeric
      / NULLIF(COUNT(DISTINCT c.user_id), 0)) * 100 AS retention_d7_pct,
    (COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 30 THEN c.user_id END)::numeric
      / NULLIF(COUNT(DISTINCT c.user_id), 0)) * 100 AS retention_d30_pct
  FROM cohort_filtered c
  LEFT JOIN activity a ON a.user_id = c.user_id
  GROUP BY c.cohort_date
  ORDER BY c.cohort_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_retention_cohorts(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_retention_cohorts(uuid, integer) TO authenticated;

-- Feature adoption (keep signature)
CREATE OR REPLACE FUNCTION public.get_feature_adoption(
  p_workspace_id uuid,
  p_days integer DEFAULT 30,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  feature_name text,
  users bigint,
  total_events bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_from timestamptz;
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

  v_from := now() - make_interval(days => GREATEST(1, COALESCE(p_days, 30)));

  RETURN QUERY
  WITH base AS (
    SELECT
      ae.user_id,
      COALESCE(NULLIF(ae.event_properties->>'feature_name', ''), 'unknown') AS feature_name
    FROM public.analytics_events ae
    WHERE ae.workspace_id = p_workspace_id
      AND ae.created_at >= v_from
      AND ae.event_type IN ('feature.discovered', 'feature_discovered')
  )
  SELECT
    b.feature_name,
    COUNT(DISTINCT b.user_id) AS users,
    COUNT(*) AS total_events
  FROM base b
  GROUP BY b.feature_name
  ORDER BY users DESC, total_events DESC
  LIMIT COALESCE(p_limit, 10);
END;
$$;

REVOKE ALL ON FUNCTION public.get_feature_adoption(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feature_adoption(uuid, integer, integer) TO authenticated;

COMMIT;