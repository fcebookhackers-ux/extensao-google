-- =============================================
-- ÍNDICES DE PERFORMANCE (ajustados ao schema atual)
-- =============================================

-- Webhooks: busca por usuário + ativo + data
CREATE INDEX IF NOT EXISTS idx_webhooks_user_active_created
  ON public.webhooks (user_id, is_active, created_at DESC);

-- Webhook Logs: análise por webhook + sucesso + execução
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_success_executed
  ON public.webhook_logs (webhook_id, success, executed_at DESC);

-- Webhook Logs: p95/latência por webhook (somente sucessos)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_duration_success
  ON public.webhook_logs (webhook_id, duration_ms)
  WHERE success = true;

-- Messages: busca por contato + data
CREATE INDEX IF NOT EXISTS idx_messages_contact_created
  ON public.messages (contact_id, created_at DESC);

-- Media Library: busca por pasta + mime (apenas quando folder_id existe)
CREATE INDEX IF NOT EXISTS idx_media_folder_mime
  ON public.media_library (folder_id, mime_type)
  WHERE folder_id IS NOT NULL;

-- Audit Events: busca por workspace + ação + data
CREATE INDEX IF NOT EXISTS idx_audit_workspace_action_created
  ON public.audit_events (workspace_id, action, created_at DESC);

-- Webhooks ativos: lookup rápido por nome dentro do usuário
CREATE INDEX IF NOT EXISTS idx_webhooks_active_by_user_name
  ON public.webhooks (user_id, name)
  WHERE is_active = true;


-- =============================================
-- MATERIALIZED VIEWS PARA ANALYTICS
-- =============================================

-- 1) Estatísticas de Webhooks por Usuário
CREATE MATERIALIZED VIEW IF NOT EXISTS public.webhook_stats_by_user AS
SELECT
  w.user_id,
  COUNT(DISTINCT w.id) AS total_webhooks,
  COUNT(DISTINCT CASE WHEN w.is_active THEN w.id END) AS active_webhooks,
  COUNT(wl.id) AS total_executions,
  COUNT(CASE WHEN wl.success = true THEN 1 END) AS successful_executions,
  COUNT(CASE WHEN wl.success = false THEN 1 END) AS failed_executions,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wl.duration_ms) AS p95_latency,
  AVG(wl.duration_ms) AS avg_latency,
  MAX(wl.executed_at) AS last_execution
FROM public.webhooks w
LEFT JOIN public.webhook_logs wl ON w.id = wl.webhook_id
GROUP BY w.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_stats_by_user_user_id_uidx
  ON public.webhook_stats_by_user (user_id);


-- 2) Uso de Storage por Usuário
CREATE MATERIALIZED VIEW IF NOT EXISTS public.storage_stats_by_user AS
SELECT
  user_id,
  COUNT(*) AS total_files,
  COALESCE(SUM(file_size), 0) AS total_size_bytes,
  (COALESCE(SUM(file_size), 0) / 1024.0 / 1024.0 / 1024.0) AS total_size_gb,
  COUNT(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) AS image_count,
  COUNT(CASE WHEN mime_type LIKE 'video/%' THEN 1 END) AS video_count,
  COUNT(CASE WHEN mime_type LIKE 'audio/%' THEN 1 END) AS audio_count,
  MAX(created_at) AS last_upload
FROM public.media_library
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS storage_stats_by_user_user_id_uidx
  ON public.storage_stats_by_user (user_id);


-- 3) Performance de Automações (baseada em automation_metrics existente)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.automation_performance AS
SELECT
  am.automation_id,
  am.user_id,
  am.name,
  am.status,
  am.last_activity_at,
  am.messages_sent,
  am.messages_delivered,
  am.messages_read,
  am.messages_replied,
  am.messages_failed,
  am.unique_contacts_reached
FROM public.automation_metrics am;

CREATE UNIQUE INDEX IF NOT EXISTS automation_performance_automation_id_uidx
  ON public.automation_performance (automation_id);


-- =============================================
-- FUNÇÃO DE REFRESH (CONCURRENTLY)
-- =============================================

CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Requer índices UNIQUE nas MVs para CONCURRENTLY
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.webhook_stats_by_user;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.storage_stats_by_user;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.automation_performance;
END;
$$;
