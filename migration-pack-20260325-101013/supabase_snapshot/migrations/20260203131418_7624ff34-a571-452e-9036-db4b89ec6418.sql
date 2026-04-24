-- Cleanup logs + cleanup function driven by retention policies

CREATE TABLE IF NOT EXISTS public.cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.retention_entity_type NOT NULL,
  workspace_id uuid NULL,
  policy_id uuid NULL REFERENCES public.data_retention_policies(id) ON DELETE SET NULL,
  deletion_strategy public.retention_deletion_strategy NOT NULL,
  cutoff_at timestamptz NOT NULL,
  deleted_count bigint NOT NULL DEFAULT 0,
  execution_time_ms bigint NULL,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cleanup_logs_executed_at ON public.cleanup_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS cleanup_logs_workspace_id ON public.cleanup_logs(workspace_id);
CREATE INDEX IF NOT EXISTS cleanup_logs_entity_type ON public.cleanup_logs(entity_type);

ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cleanup_logs_select ON public.cleanup_logs;
CREATE POLICY cleanup_logs_select
ON public.cleanup_logs
FOR SELECT
USING (
  (workspace_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)) OR
  (
    workspace_id IS NOT NULL
    AND is_workspace_member(workspace_id, auth.uid())
    AND has_permission('settings.manage'::text, workspace_id)
  )
);

-- No direct inserts/updates/deletes from clients

CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS TABLE (
  entity_type text,
  workspace_id uuid,
  deleted_count bigint,
  execution_time_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy RECORD;
  start_time timestamptz;
  rows_affected bigint;
  cutoff timestamptz;
BEGIN
  FOR policy IN
    SELECT *
    FROM public.data_retention_policies
    WHERE is_global = true OR apply_to_workspace_id IS NOT NULL
  LOOP
    start_time := clock_timestamp();
    cutoff := now() - make_interval(days => policy.retention_days);
    rows_affected := 0;

    -- IMPORTANT: avoid dynamic SQL; explicit cases only.
    IF policy.deletion_strategy <> 'hard_delete' THEN
      -- For now we only execute hard_delete in this function.
      -- soft_delete/anonymize require entity-specific schemas/columns.
      CONTINUE;
    END IF;

    IF policy.entity_type = 'webhook_logs' THEN
      DELETE FROM public.webhook_logs
      WHERE executed_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSIF policy.entity_type = 'rate_limit_events' THEN
      DELETE FROM public.rate_limit_events
      WHERE created_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSIF policy.entity_type = 'audit_events' THEN
      DELETE FROM public.audit_events
      WHERE created_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSIF policy.entity_type = 'analytics_events' THEN
      DELETE FROM public.analytics_events
      WHERE created_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSE
      -- data_exports cleanup is handled in the edge function because it requires Storage removal.
      CONTINUE;
    END IF;

    INSERT INTO public.cleanup_logs (
      entity_type,
      workspace_id,
      policy_id,
      deletion_strategy,
      cutoff_at,
      deleted_count,
      execution_time_ms
    ) VALUES (
      policy.entity_type,
      policy.apply_to_workspace_id,
      policy.id,
      policy.deletion_strategy,
      cutoff,
      rows_affected,
      EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    );

    entity_type := policy.entity_type::text;
    workspace_id := policy.apply_to_workspace_id;
    deleted_count := rows_affected;
    execution_time_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000)::bigint;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data() TO service_role;
