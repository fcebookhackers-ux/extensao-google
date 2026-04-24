-- System health analytics RPCs

-- Uptime series (hourly)
CREATE OR REPLACE FUNCTION public.get_webhook_uptime_hourly(p_hours integer DEFAULT 24)
RETURNS TABLE(
  hour timestamptz,
  successful bigint,
  total bigint,
  uptime_pct numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    date_trunc('hour', l.executed_at) AS hour,
    count(*) FILTER (WHERE l.success IS TRUE) AS successful,
    count(*) AS total,
    CASE
      WHEN count(*) = 0 THEN 0
      ELSE (count(*) FILTER (WHERE l.success IS TRUE)::numeric / count(*)::numeric) * 100
    END AS uptime_pct
  FROM public.webhook_logs l
  JOIN public.webhooks w ON w.id = l.webhook_id
  WHERE w.user_id = auth.uid()
    AND l.executed_at IS NOT NULL
    AND l.executed_at > now() - make_interval(hours => p_hours)
  GROUP BY 1
  ORDER BY 1;
$$;

-- Uptime series (daily)
CREATE OR REPLACE FUNCTION public.get_webhook_uptime_daily(p_days integer DEFAULT 30)
RETURNS TABLE(
  day date,
  successful bigint,
  total bigint,
  uptime_pct numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    date_trunc('day', l.executed_at)::date AS day,
    count(*) FILTER (WHERE l.success IS TRUE) AS successful,
    count(*) AS total,
    CASE
      WHEN count(*) = 0 THEN 0
      ELSE (count(*) FILTER (WHERE l.success IS TRUE)::numeric / count(*)::numeric) * 100
    END AS uptime_pct
  FROM public.webhook_logs l
  JOIN public.webhooks w ON w.id = l.webhook_id
  WHERE w.user_id = auth.uid()
    AND l.executed_at IS NOT NULL
    AND l.executed_at > now() - make_interval(days => p_days)
  GROUP BY 1
  ORDER BY 1;
$$;

-- Latency percentiles (ms)
CREATE OR REPLACE FUNCTION public.get_webhook_latency_percentiles(p_minutes integer DEFAULT 60)
RETURNS TABLE(
  p50_latency_ms numeric,
  p95_latency_ms numeric,
  p99_latency_ms numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    percentile_cont(0.50) WITHIN GROUP (ORDER BY l.duration_ms) AS p50_latency_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY l.duration_ms) AS p95_latency_ms,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY l.duration_ms) AS p99_latency_ms
  FROM public.webhook_logs l
  JOIN public.webhooks w ON w.id = l.webhook_id
  WHERE w.user_id = auth.uid()
    AND l.executed_at IS NOT NULL
    AND l.executed_at > now() - make_interval(mins => p_minutes)
    AND l.duration_ms IS NOT NULL;
$$;

-- Ensure indexes for time-windowed aggregation (non-destructive)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_executed_at ON public.webhook_logs (executed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id_executed_at ON public.webhook_logs (webhook_id, executed_at);
