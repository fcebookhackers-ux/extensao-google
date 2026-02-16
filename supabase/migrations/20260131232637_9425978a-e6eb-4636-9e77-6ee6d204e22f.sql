-- Add workspace_id to webhooks (needed for workspace-scoped comments)
ALTER TABLE public.webhooks
ADD COLUMN IF NOT EXISTS workspace_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON public.webhooks(workspace_id);
