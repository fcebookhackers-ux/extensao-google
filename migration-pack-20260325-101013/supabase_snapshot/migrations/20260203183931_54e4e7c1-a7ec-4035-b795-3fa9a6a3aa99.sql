-- SSRF blocked attempts audit log
CREATE TABLE IF NOT EXISTS public.webhook_validation_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  url text NOT NULL,
  blocked_reason text NOT NULL,
  resolved_ips text[] NULL,
  user_id uuid NULL,
  workspace_id uuid NULL,
  ip_address inet NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_validation_blocks_created_at
  ON public.webhook_validation_blocks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_validation_blocks_workspace_id
  ON public.webhook_validation_blocks (workspace_id);

CREATE INDEX IF NOT EXISTS idx_webhook_validation_blocks_user_id
  ON public.webhook_validation_blocks (user_id);

ALTER TABLE public.webhook_validation_blocks ENABLE ROW LEVEL SECURITY;

-- Only service role writes (Edge Functions use SERVICE_ROLE_KEY)
DO $$ BEGIN
  CREATE POLICY "service_role_insert_webhook_validation_blocks"
  ON public.webhook_validation_blocks
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Admins can read everything
DO $$ BEGIN
  CREATE POLICY "admins_select_webhook_validation_blocks"
  ON public.webhook_validation_blocks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Workspace managers can read their workspace logs
DO $$ BEGIN
  CREATE POLICY "workspace_managers_select_webhook_validation_blocks"
  ON public.webhook_validation_blocks
  FOR SELECT
  USING (
    workspace_id IS NOT NULL
    AND is_workspace_member(workspace_id, auth.uid())
    AND has_permission('settings.manage'::text, workspace_id)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;