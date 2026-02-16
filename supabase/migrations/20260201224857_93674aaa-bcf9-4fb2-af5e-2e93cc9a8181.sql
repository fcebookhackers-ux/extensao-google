-- Append-only audit log for compliance

CREATE TABLE IF NOT EXISTS public.immutable_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure append-only: block UPDATE/DELETE at database level
CREATE OR REPLACE FUNCTION public.block_immutable_audit_log_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'immutable_audit_log is append-only (UPDATE blocked)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'immutable_audit_log is append-only (DELETE blocked)';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_immutable_audit_log_mutations ON public.immutable_audit_log;
CREATE TRIGGER trg_block_immutable_audit_log_mutations
BEFORE UPDATE OR DELETE ON public.immutable_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.block_immutable_audit_log_mutations();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_immutable_audit_user_created_at
  ON public.immutable_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_immutable_audit_action_created_at
  ON public.immutable_audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_immutable_audit_entity
  ON public.immutable_audit_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_immutable_audit_workspace_created_at
  ON public.immutable_audit_log(workspace_id, created_at DESC);

-- RLS
ALTER TABLE public.immutable_audit_log ENABLE ROW LEVEL SECURITY;

-- Insert allowed only for authenticated users into their own user_id.
-- (Edge Function will insert using the caller's JWT, not service_role.)
DROP POLICY IF EXISTS immutable_audit_insert_own ON public.immutable_audit_log;
CREATE POLICY immutable_audit_insert_own
ON public.immutable_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    workspace_id IS NULL
    OR is_workspace_member(workspace_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Workspace members can read logs for their workspace
DROP POLICY IF EXISTS immutable_audit_select_workspace ON public.immutable_audit_log;
CREATE POLICY immutable_audit_select_workspace
ON public.immutable_audit_log
FOR SELECT
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND is_workspace_member(workspace_id, auth.uid())
);

-- Admins can read all logs (global)
DROP POLICY IF EXISTS immutable_audit_select_admin_all ON public.immutable_audit_log;
CREATE POLICY immutable_audit_select_admin_all
ON public.immutable_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- No UPDATE/DELETE policies on purpose (append-only).