-- =============================================
-- FIX: Materialized Views não devem ficar expostas na API
-- Estratégia: mover MVs para schema "private" (não exposto pelo PostgREST)
-- e expor acesso via funções RPC SECURITY DEFINER
-- =============================================

CREATE SCHEMA IF NOT EXISTS private;

-- Mover materialized views criadas para schema privado
ALTER MATERIALIZED VIEW IF EXISTS public.webhook_stats_by_user SET SCHEMA private;
ALTER MATERIALIZED VIEW IF EXISTS public.storage_stats_by_user SET SCHEMA private;
ALTER MATERIALIZED VIEW IF EXISTS public.automation_performance SET SCHEMA private;

-- Recriar/atualizar função de refresh apontando para schema private
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.webhook_stats_by_user;
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.storage_stats_by_user;
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.automation_performance;
END;
$$;

-- RPCs para leitura (sem expor MVs diretamente)
CREATE OR REPLACE FUNCTION public.get_webhook_stats_by_user()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT to_jsonb(mv)
  FROM private.webhook_stats_by_user mv
  WHERE mv.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_storage_stats_by_user()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT to_jsonb(mv)
  FROM private.storage_stats_by_user mv
  WHERE mv.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_automation_performance_by_user()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT jsonb_agg(to_jsonb(mv) ORDER BY mv.last_activity_at DESC NULLS LAST)
  FROM private.automation_performance mv
  WHERE mv.user_id = auth.uid();
$$;
