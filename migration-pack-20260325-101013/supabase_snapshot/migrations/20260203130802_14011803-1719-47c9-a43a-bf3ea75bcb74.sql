-- Data retention policies (LGPD)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retention_entity_type') THEN
    CREATE TYPE public.retention_entity_type AS ENUM (
      'data_exports',
      'webhook_logs',
      'rate_limit_events',
      'audit_events',
      'analytics_events'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retention_deletion_strategy') THEN
    CREATE TYPE public.retention_deletion_strategy AS ENUM (
      'hard_delete',
      'soft_delete',
      'anonymize'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.retention_entity_type NOT NULL,
  retention_days integer NOT NULL,
  deletion_strategy public.retention_deletion_strategy NOT NULL DEFAULT 'hard_delete',
  apply_to_workspace_id uuid NULL,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT data_retention_policies_retention_days_positive CHECK (retention_days > 0),
  CONSTRAINT data_retention_policies_scope_check CHECK (
    (apply_to_workspace_id IS NOT NULL AND is_global = false) OR
    (apply_to_workspace_id IS NULL AND is_global = true)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS data_retention_policies_unique_scope
  ON public.data_retention_policies(entity_type, apply_to_workspace_id);

CREATE INDEX IF NOT EXISTS data_retention_policies_entity_type
  ON public.data_retention_policies(entity_type);

CREATE INDEX IF NOT EXISTS data_retention_policies_workspace
  ON public.data_retention_policies(apply_to_workspace_id);

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Policies:
-- - Global policies: only admins can manage/view
-- - Workspace policies: workspace members with settings.manage can view/manage

DROP POLICY IF EXISTS data_retention_policies_select ON public.data_retention_policies;
CREATE POLICY data_retention_policies_select
ON public.data_retention_policies
FOR SELECT
USING (
  (is_global = true AND has_role(auth.uid(), 'admin'::app_role)) OR
  (
    apply_to_workspace_id IS NOT NULL
    AND is_workspace_member(apply_to_workspace_id, auth.uid())
    AND has_permission('settings.manage'::text, apply_to_workspace_id)
  )
);

DROP POLICY IF EXISTS data_retention_policies_insert ON public.data_retention_policies;
CREATE POLICY data_retention_policies_insert
ON public.data_retention_policies
FOR INSERT
WITH CHECK (
  (is_global = true AND has_role(auth.uid(), 'admin'::app_role)) OR
  (
    apply_to_workspace_id IS NOT NULL
    AND is_workspace_member(apply_to_workspace_id, auth.uid())
    AND has_permission('settings.manage'::text, apply_to_workspace_id)
  )
);

DROP POLICY IF EXISTS data_retention_policies_update ON public.data_retention_policies;
CREATE POLICY data_retention_policies_update
ON public.data_retention_policies
FOR UPDATE
USING (
  (is_global = true AND has_role(auth.uid(), 'admin'::app_role)) OR
  (
    apply_to_workspace_id IS NOT NULL
    AND is_workspace_member(apply_to_workspace_id, auth.uid())
    AND has_permission('settings.manage'::text, apply_to_workspace_id)
  )
)
WITH CHECK (
  (is_global = true AND has_role(auth.uid(), 'admin'::app_role)) OR
  (
    apply_to_workspace_id IS NOT NULL
    AND is_workspace_member(apply_to_workspace_id, auth.uid())
    AND has_permission('settings.manage'::text, apply_to_workspace_id)
  )
);

DROP POLICY IF EXISTS data_retention_policies_delete ON public.data_retention_policies;
CREATE POLICY data_retention_policies_delete
ON public.data_retention_policies
FOR DELETE
USING (
  (is_global = true AND has_role(auth.uid(), 'admin'::app_role)) OR
  (
    apply_to_workspace_id IS NOT NULL
    AND is_workspace_member(apply_to_workspace_id, auth.uid())
    AND has_permission('settings.manage'::text, apply_to_workspace_id)
  )
);

-- updated_at trigger (reuse existing function if present)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS update_data_retention_policies_updated_at ON public.data_retention_policies;
    CREATE TRIGGER update_data_retention_policies_updated_at
    BEFORE UPDATE ON public.data_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Seed default global policies (idempotent)
INSERT INTO public.data_retention_policies (entity_type, retention_days, deletion_strategy, is_global)
VALUES
  ('data_exports', 7, 'hard_delete', true),
  ('webhook_logs', 90, 'hard_delete', true),
  ('rate_limit_events', 30, 'hard_delete', true),
  ('audit_events', 365, 'hard_delete', true),
  ('analytics_events', 90, 'hard_delete', true)
ON CONFLICT (entity_type, apply_to_workspace_id)
DO UPDATE SET
  retention_days = EXCLUDED.retention_days,
  deletion_strategy = EXCLUDED.deletion_strategy,
  is_global = EXCLUDED.is_global;