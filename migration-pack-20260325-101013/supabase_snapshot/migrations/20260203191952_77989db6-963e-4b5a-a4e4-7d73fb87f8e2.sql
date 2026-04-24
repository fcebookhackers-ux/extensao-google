-- PROMPT LOVABLE #5: Observabilidade com SLIs/SLOs (fix: policies sem IF NOT EXISTS)

-- 1) Tabela de métricas agregadas (janelas)
CREATE TABLE IF NOT EXISTS public.sli_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  target NUMERIC NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sli_metrics_domain_window_start
  ON public.sli_metrics (domain, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_sli_metrics_domain_created_at
  ON public.sli_metrics (domain, created_at DESC);

ALTER TABLE public.sli_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sli_metrics_select_authenticated ON public.sli_metrics;
DROP POLICY IF EXISTS sli_metrics_insert_service_role ON public.sli_metrics;
DROP POLICY IF EXISTS sli_metrics_update_service_role ON public.sli_metrics;
DROP POLICY IF EXISTS sli_metrics_delete_service_role ON public.sli_metrics;

CREATE POLICY sli_metrics_select_authenticated
  ON public.sli_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Escrita: apenas service role (edge functions / jobs)
CREATE POLICY sli_metrics_insert_service_role
  ON public.sli_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY sli_metrics_update_service_role
  ON public.sli_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'service_role');

CREATE POLICY sli_metrics_delete_service_role
  ON public.sli_metrics
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'service_role');

-- 2) Eventos de upload (instrumentação do validate-upload)
CREATE TABLE IF NOT EXISTS public.upload_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NULL,
  status TEXT NOT NULL,
  validation_duration_ms INTEGER NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_events_user_time
  ON public.upload_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_events_time
  ON public.upload_events (created_at DESC);

ALTER TABLE public.upload_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upload_events_select_own ON public.upload_events;
DROP POLICY IF EXISTS upload_events_insert_own ON public.upload_events;

CREATE POLICY upload_events_select_own
  ON public.upload_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY upload_events_insert_own
  ON public.upload_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) Eventos de sync offline (instrumentação do sync-yjs)
CREATE TABLE IF NOT EXISTS public.sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NULL,
  entity_type TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_events_user_time
  ON public.sync_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_events_time
  ON public.sync_events (created_at DESC);

ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_events_select_own ON public.sync_events;
DROP POLICY IF EXISTS sync_events_insert_own ON public.sync_events;

CREATE POLICY sync_events_select_own
  ON public.sync_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY sync_events_insert_own
  ON public.sync_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4) Eventos de execução de automações (instrumentação futura)
CREATE TABLE IF NOT EXISTS public.automation_execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NULL,
  automation_id UUID NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_exec_events_user_time
  ON public.automation_execution_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_exec_events_time
  ON public.automation_execution_events (created_at DESC);

ALTER TABLE public.automation_execution_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_exec_events_select_own ON public.automation_execution_events;
DROP POLICY IF EXISTS automation_exec_events_insert_own ON public.automation_execution_events;

CREATE POLICY automation_exec_events_select_own
  ON public.automation_execution_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY automation_exec_events_insert_own
  ON public.automation_execution_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5) Funções de cálculo de SLIs
CREATE OR REPLACE FUNCTION public.calculate_sli_webhooks(p_window_hours INTEGER DEFAULT 24)
RETURNS TABLE(
  success_rate NUMERIC,
  p95_latency NUMERIC,
  total_executions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE success = true)::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_latency,
    COUNT(*) AS total_executions
  FROM public.webhook_logs
  WHERE executed_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_sli_uploads(p_window_hours INTEGER DEFAULT 24)
RETURNS TABLE(
  success_rate NUMERIC,
  p95_validation_time NUMERIC,
  total_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY validation_duration_ms), 0) AS p95_validation_time,
    COUNT(*) AS total_events
  FROM public.upload_events
  WHERE created_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_sli_sync(p_window_hours INTEGER DEFAULT 24)
RETURNS TABLE(
  success_rate NUMERIC,
  p95_latency NUMERIC,
  total_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_latency,
    COUNT(*) AS total_events
  FROM public.sync_events
  WHERE created_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_sli_automations(p_window_hours INTEGER DEFAULT 24)
RETURNS TABLE(
  success_rate NUMERIC,
  p95_latency NUMERIC,
  total_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_latency,
    COUNT(*) AS total_events
  FROM public.automation_execution_events
  WHERE created_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;
