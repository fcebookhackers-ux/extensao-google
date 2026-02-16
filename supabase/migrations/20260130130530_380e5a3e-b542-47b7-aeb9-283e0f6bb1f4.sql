-- 1) Add duration_ms to webhook_logs (needed for response time analytics)
ALTER TABLE public.webhook_logs
ADD COLUMN IF NOT EXISTS duration_ms integer;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_executed_at
  ON public.webhook_logs (webhook_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_status
  ON public.webhook_logs (webhook_id, response_status);

-- 2) Materialized view for per-webhook analytics (last 90 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.webhook_analytics_summary AS
SELECT
  w.id as webhook_id,
  w.user_id,
  w.name as webhook_name,
  w.url,

  COUNT(wl.id)::bigint as total_deliveries,
  COUNT(wl.id) FILTER (WHERE wl.response_status >= 200 AND wl.response_status < 300)::bigint as successful_deliveries,
  COUNT(wl.id) FILTER (WHERE (wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)::bigint as failed_deliveries,

  ROUND(AVG(wl.duration_ms)::numeric, 2) as avg_response_time_ms,
  MAX(wl.duration_ms) as max_response_time_ms,

  MIN(wl.executed_at) as first_delivery_at,
  MAX(wl.executed_at) as last_delivery_at,

  CASE
    WHEN COUNT(wl.id) > 0 THEN
      ROUND((COUNT(wl.id) FILTER (WHERE wl.response_status >= 200 AND wl.response_status < 300)::numeric / COUNT(wl.id)) * 100, 2)
    ELSE 0
  END as success_rate_percentage,

  wcb.state as circuit_breaker_state,
  wcb.consecutive_failures

FROM public.webhooks w
LEFT JOIN public.webhook_logs wl
  ON w.id = wl.webhook_id
  AND wl.executed_at >= NOW() - INTERVAL '90 days'
LEFT JOIN public.webhook_circuit_breaker wcb
  ON w.id = wcb.webhook_id
GROUP BY w.id, w.user_id, w.name, w.url, wcb.state, wcb.consecutive_failures;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_analytics_id
  ON public.webhook_analytics_summary(webhook_id);

-- Do not expose matview over API
REVOKE ALL ON public.webhook_analytics_summary FROM anon, authenticated;

-- 3) Refresh function
CREATE OR REPLACE FUNCTION public.refresh_webhook_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.webhook_analytics_summary;
END;
$$;

-- 4) RPCs (scoped to auth.uid)

-- 4.1 Global summary across user webhooks
CREATE OR REPLACE FUNCTION public.get_global_webhook_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_webhooks bigint;
  v_active_webhooks bigint;
  v_total_deliveries bigint;
  v_successful_deliveries bigint;
  v_failed_deliveries bigint;
  v_avg_response_time_ms numeric;
BEGIN
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true)::bigint
  INTO v_total_webhooks, v_active_webhooks
  FROM public.webhooks
  WHERE user_id = auth.uid();

  SELECT
    COALESCE(SUM(total_deliveries), 0)::bigint,
    COALESCE(SUM(successful_deliveries), 0)::bigint,
    COALESCE(SUM(failed_deliveries), 0)::bigint,
    COALESCE(ROUND(AVG(avg_response_time_ms)::numeric, 2), 0)
  INTO v_total_deliveries, v_successful_deliveries, v_failed_deliveries, v_avg_response_time_ms
  FROM public.webhook_analytics_summary
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'total_webhooks', COALESCE(v_total_webhooks, 0),
    'active_webhooks', COALESCE(v_active_webhooks, 0),
    'total_deliveries', COALESCE(v_total_deliveries, 0),
    'successful_deliveries', COALESCE(v_successful_deliveries, 0),
    'failed_deliveries', COALESCE(v_failed_deliveries, 0),
    'success_rate', CASE
      WHEN COALESCE(v_total_deliveries, 0) > 0 THEN ROUND((v_successful_deliveries::numeric / v_total_deliveries::numeric) * 100, 2)
      ELSE 0
    END,
    'avg_response_time_ms', COALESCE(v_avg_response_time_ms, 0)
  );
END;
$$;

-- 4.2 List per-webhook summaries for user
CREATE OR REPLACE FUNCTION public.get_webhook_analytics_summaries()
RETURNS SETOF public.webhook_analytics_summary
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.webhook_analytics_summary
  WHERE user_id = auth.uid()
  ORDER BY last_delivery_at DESC NULLS LAST;
$$;

-- 4.3 Per-webhook summary JSON
CREATE OR REPLACE FUNCTION public.get_webhook_analytics(p_webhook_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary RECORD;
BEGIN
  -- ensure ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.webhooks w
    WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso ao webhook';
  END IF;

  SELECT * INTO v_summary
  FROM public.webhook_analytics_summary
  WHERE webhook_id = p_webhook_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'webhook_id', p_webhook_id,
      'total_deliveries', 0,
      'successful_deliveries', 0,
      'failed_deliveries', 0,
      'success_rate_percentage', 0,
      'avg_response_time_ms', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'webhook_id', v_summary.webhook_id,
    'webhook_name', v_summary.webhook_name,
    'url', v_summary.url,
    'total_deliveries', v_summary.total_deliveries,
    'successful_deliveries', v_summary.successful_deliveries,
    'failed_deliveries', v_summary.failed_deliveries,
    'success_rate_percentage', v_summary.success_rate_percentage,
    'avg_response_time_ms', v_summary.avg_response_time_ms,
    'max_response_time_ms', v_summary.max_response_time_ms,
    'first_delivery_at', v_summary.first_delivery_at,
    'last_delivery_at', v_summary.last_delivery_at,
    'circuit_breaker_state', v_summary.circuit_breaker_state,
    'consecutive_failures', v_summary.consecutive_failures
  );
END;
$$;

-- 4.4 Deliveries by day for a webhook
CREATE OR REPLACE FUNCTION public.get_webhook_deliveries_by_day(p_webhook_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE(
  delivery_date date,
  total_deliveries bigint,
  successful bigint,
  failed bigint,
  avg_response_time_ms numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (date_trunc('day', wl.executed_at))::date as delivery_date,
    COUNT(*)::bigint as total_deliveries,
    COUNT(*) FILTER (WHERE wl.response_status >= 200 AND wl.response_status < 300)::bigint as successful,
    COUNT(*) FILTER (WHERE (wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)::bigint as failed,
    ROUND(AVG(wl.duration_ms)::numeric, 2) as avg_response_time_ms
  FROM public.webhook_logs wl
  WHERE wl.webhook_id = p_webhook_id
    AND wl.executed_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
    AND EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
    )
  GROUP BY (date_trunc('day', wl.executed_at))::date
  ORDER BY delivery_date ASC;
$$;

-- 4.5 Top events for a webhook
CREATE OR REPLACE FUNCTION public.get_webhook_top_events(p_webhook_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 10)
RETURNS TABLE(
  event_type text,
  event_count bigint,
  successful_count bigint,
  failed_count bigint,
  last_triggered_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wl.event_type,
    COUNT(*)::bigint as event_count,
    COUNT(*) FILTER (WHERE wl.response_status >= 200 AND wl.response_status < 300)::bigint as successful_count,
    COUNT(*) FILTER (WHERE (wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)::bigint as failed_count,
    MAX(wl.executed_at) as last_triggered_at
  FROM public.webhook_logs wl
  WHERE wl.webhook_id = p_webhook_id
    AND wl.executed_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
    AND EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
    )
  GROUP BY wl.event_type
  ORDER BY event_count DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

-- 4.6 Status code distribution for a webhook
CREATE OR REPLACE FUNCTION public.get_webhook_status_code_distribution(p_webhook_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE(
  status_code integer,
  count bigint,
  percentage numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT wl.response_status as status_code
    FROM public.webhook_logs wl
    WHERE wl.webhook_id = p_webhook_id
      AND wl.response_status IS NOT NULL
      AND wl.executed_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
      AND EXISTS (
        SELECT 1 FROM public.webhooks w
        WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
      )
  )
  SELECT
    status_code,
    COUNT(*)::bigint as count,
    ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0)) * 100, 2) as percentage
  FROM base
  GROUP BY status_code
  ORDER BY count DESC;
$$;

-- 4.7 Health check list (all user webhooks)
CREATE OR REPLACE FUNCTION public.get_webhook_health_check()
RETURNS TABLE(
  webhook_id uuid,
  name text,
  url text,
  is_active boolean,
  deliveries_24h bigint,
  failures_24h bigint,
  deliveries_7d bigint,
  failures_7d bigint,
  circuit_state public.circuit_breaker_state,
  consecutive_failures integer,
  health_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id as webhook_id,
    w.name,
    w.url,
    COALESCE(w.is_active, true) as is_active,

    COUNT(wl.id) FILTER (WHERE wl.executed_at >= NOW() - INTERVAL '24 hours')::bigint as deliveries_24h,
    COUNT(wl.id) FILTER (
      WHERE wl.executed_at >= NOW() - INTERVAL '24 hours'
        AND ((wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)
    )::bigint as failures_24h,

    COUNT(wl.id) FILTER (WHERE wl.executed_at >= NOW() - INTERVAL '7 days')::bigint as deliveries_7d,
    COUNT(wl.id) FILTER (
      WHERE wl.executed_at >= NOW() - INTERVAL '7 days'
        AND ((wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)
    )::bigint as failures_7d,

    wcb.state as circuit_state,
    wcb.consecutive_failures,

    CASE
      WHEN wcb.state = 'open' THEN 'critical'
      WHEN COUNT(wl.id) FILTER (
        WHERE wl.executed_at >= NOW() - INTERVAL '24 hours'
          AND ((wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)
      ) > 10 THEN 'warning'
      WHEN COUNT(wl.id) FILTER (WHERE wl.executed_at >= NOW() - INTERVAL '24 hours') = 0 THEN 'inactive'
      ELSE 'healthy'
    END as health_status

  FROM public.webhooks w
  LEFT JOIN public.webhook_logs wl ON w.id = wl.webhook_id
  LEFT JOIN public.webhook_circuit_breaker wcb ON w.id = wcb.webhook_id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id, w.name, w.url, w.is_active, wcb.state, wcb.consecutive_failures
  ORDER BY health_status DESC;
$$;
