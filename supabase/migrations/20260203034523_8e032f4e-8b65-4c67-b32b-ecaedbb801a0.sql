-- Performance indexes (adapted to current schema)

-- Contacts: workspace scoping + search patterns + tags
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_name_pattern
  ON public.contacts (workspace_id, name text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_phone_pattern
  ON public.contacts (workspace_id, phone text_pattern_ops)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_tags_gin
  ON public.contacts USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_status_updated
  ON public.contacts (workspace_id, status, updated_at DESC);

-- Automations: listing by workspace/status recency
CREATE INDEX IF NOT EXISTS idx_automations_workspace_status_created
  ON public.automations (workspace_id, status, created_at DESC);

-- Webhook jobs: pending queue queries
CREATE INDEX IF NOT EXISTS idx_webhook_jobs_status_next_retry
  ON public.webhook_jobs (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_webhook_jobs_webhook_status_created
  ON public.webhook_jobs (webhook_id, status, created_at DESC);

-- Webhook logs: analytics queries and troubleshooting
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_executed
  ON public.webhook_logs (webhook_id, executed_at DESC);

-- Media library: quota / recent uploads per workspace
CREATE INDEX IF NOT EXISTS idx_media_library_workspace_created
  ON public.media_library (workspace_id, created_at DESC)
  INCLUDE (file_size);

-- Audit: temporal queries
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_created
  ON public.audit_events (workspace_id, created_at DESC);


-- Slow query monitoring (restricted to admin) via pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.get_slow_queries(limit_rows integer DEFAULT 20)
RETURNS TABLE(
  query text,
  calls bigint,
  avg_time_ms double precision,
  total_exec_time double precision,
  avg_rows double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    s.query,
    s.calls,
    (s.total_exec_time / NULLIF(s.calls, 0)) AS avg_time_ms,
    s.total_exec_time,
    (s.rows::double precision / NULLIF(s.calls, 0)) AS avg_rows
  FROM extensions.pg_stat_statements s
  WHERE s.calls > 100
  ORDER BY s.total_exec_time DESC
  LIMIT GREATEST(1, LEAST(limit_rows, 200));
END;
$$;

REVOKE ALL ON FUNCTION public.get_slow_queries(integer) FROM PUBLIC;