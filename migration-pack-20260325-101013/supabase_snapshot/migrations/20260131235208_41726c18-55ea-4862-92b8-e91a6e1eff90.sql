-- 1) Add workspace_id to audit_events
ALTER TABLE public.audit_events
ADD COLUMN IF NOT EXISTS workspace_id uuid;

DO $$ BEGIN
  ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_workspace_id_fkey
  FOREIGN KEY (workspace_id)
  REFERENCES public.workspaces(id)
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Helpful index for workspace feed ordering
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_created_at
ON public.audit_events (workspace_id, created_at DESC);

-- 2) RLS: enable workspace-scoped reads (keep existing admin select policy)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workspace_members_select_audit_events
  ON public.audit_events
  FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;