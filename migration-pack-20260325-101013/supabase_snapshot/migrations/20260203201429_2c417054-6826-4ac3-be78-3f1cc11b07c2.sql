-- Message templates (internal builder)

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  name text NOT NULL,
  description text NULL,
  body text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Timestamp helper (shared)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON public.message_templates;
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: owner access; if workspace_id is set, allow workspace members with permission.
DROP POLICY IF EXISTS message_templates_select ON public.message_templates;
CREATE POLICY message_templates_select
ON public.message_templates
FOR SELECT
USING (
  (workspace_id IS NULL AND auth.uid() = user_id)
  OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()) AND has_permission('templates.view', workspace_id))
);

DROP POLICY IF EXISTS message_templates_insert ON public.message_templates;
CREATE POLICY message_templates_insert
ON public.message_templates
FOR INSERT
WITH CHECK (
  (workspace_id IS NULL AND auth.uid() = user_id)
  OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()) AND has_permission('templates.create', workspace_id))
);

DROP POLICY IF EXISTS message_templates_update ON public.message_templates;
CREATE POLICY message_templates_update
ON public.message_templates
FOR UPDATE
USING (
  (workspace_id IS NULL AND auth.uid() = user_id)
  OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()) AND has_permission('templates.edit', workspace_id))
)
WITH CHECK (
  (workspace_id IS NULL AND auth.uid() = user_id)
  OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()) AND has_permission('templates.edit', workspace_id))
);

DROP POLICY IF EXISTS message_templates_delete ON public.message_templates;
CREATE POLICY message_templates_delete
ON public.message_templates
FOR DELETE
USING (
  (workspace_id IS NULL AND auth.uid() = user_id)
  OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()) AND has_permission('templates.delete', workspace_id))
);

CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON public.message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_workspace_id ON public.message_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_updated_at ON public.message_templates(updated_at);
