-- Comments + unread tracking (workspace scoped)

-- 1) Utility trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Entity comments
CREATE TABLE IF NOT EXISTS public.entity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  parent_comment_id uuid NULL REFERENCES public.entity_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_comments_entity ON public.entity_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_comments_parent ON public.entity_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_entity_comments_workspace ON public.entity_comments(workspace_id);

DROP TRIGGER IF EXISTS trg_entity_comments_set_updated_at ON public.entity_comments;
CREATE TRIGGER trg_entity_comments_set_updated_at
BEFORE UPDATE ON public.entity_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.entity_comments ENABLE ROW LEVEL SECURITY;

-- Any workspace member can read comments
DROP POLICY IF EXISTS entity_comments_select_workspace ON public.entity_comments;
CREATE POLICY entity_comments_select_workspace
ON public.entity_comments
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Any workspace member can comment (user_id must be self)
DROP POLICY IF EXISTS entity_comments_insert_workspace ON public.entity_comments;
CREATE POLICY entity_comments_insert_workspace
ON public.entity_comments
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND user_id = auth.uid()
);

-- Only author can edit (and must still be workspace member)
DROP POLICY IF EXISTS entity_comments_update_own ON public.entity_comments;
CREATE POLICY entity_comments_update_own
ON public.entity_comments
FOR UPDATE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND user_id = auth.uid()
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND user_id = auth.uid()
);

-- Only author can delete (hard delete). App will soft-delete by UPDATE deleted_at.
DROP POLICY IF EXISTS entity_comments_delete_own ON public.entity_comments;
CREATE POLICY entity_comments_delete_own
ON public.entity_comments
FOR DELETE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND user_id = auth.uid()
);

-- 3) Unread badge (simple): per-user last_read_at per entity
CREATE TABLE IF NOT EXISTS public.entity_comment_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_comment_reads_entity ON public.entity_comment_reads(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_comment_reads_workspace ON public.entity_comment_reads(workspace_id);

DROP TRIGGER IF EXISTS trg_entity_comment_reads_set_updated_at ON public.entity_comment_reads;
CREATE TRIGGER trg_entity_comment_reads_set_updated_at
BEFORE UPDATE ON public.entity_comment_reads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.entity_comment_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entity_comment_reads_select_own ON public.entity_comment_reads;
CREATE POLICY entity_comment_reads_select_own
ON public.entity_comment_reads
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS entity_comment_reads_insert_own ON public.entity_comment_reads;
CREATE POLICY entity_comment_reads_insert_own
ON public.entity_comment_reads
FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS entity_comment_reads_update_own ON public.entity_comment_reads;
CREATE POLICY entity_comment_reads_update_own
ON public.entity_comment_reads
FOR UPDATE
USING (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid())
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
