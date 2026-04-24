-- Fix: Postgres não suporta ADD CONSTRAINT IF NOT EXISTS
-- Fix: evitar recursão de RLS usando SECURITY DEFINER nas funções auxiliares

-- 1) Tabelas (idempotente)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  plan_type text NOT NULL DEFAULT 'free',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  invited_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);

-- 3) Validação expires_at via trigger
CREATE OR REPLACE FUNCTION public.validate_invitation_expires_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invitation_expires_at ON public.workspace_invitations;
CREATE TRIGGER trg_validate_invitation_expires_at
BEFORE INSERT OR UPDATE ON public.workspace_invitations
FOR EACH ROW
EXECUTE FUNCTION public.validate_invitation_expires_at();

-- 4) Funções auxiliares (SECURITY DEFINER para evitar recursão em RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_user_role(p_workspace_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wm.role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.workspace_has_permission(
  p_workspace_id uuid,
  p_permission text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
BEGIN
  r := public.workspace_user_role(p_workspace_id, p_user_id);

  IF r IS NULL THEN
    RETURN false;
  END IF;

  IF r = 'owner' THEN
    RETURN true;
  END IF;

  IF r = 'admin' THEN
    RETURN p_permission IN (
      'workspace.settings.update',
      'members.invite',
      'members.remove',
      'automations.create',
      'automations.edit',
      'automations.delete',
      'webhooks.manage',
      'media.manage'
    );
  END IF;

  IF r = 'member' THEN
    RETURN p_permission IN (
      'automations.create',
      'automations.edit',
      'webhooks.create',
      'webhooks.edit',
      'media.upload'
    );
  END IF;

  IF r = 'viewer' THEN
    RETURN p_permission IN (
      'automations.view',
      'webhooks.view',
      'media.view'
    );
  END IF;

  RETURN false;
END;
$$;

-- 5) Policies (drop+create para idempotência)
DO $$
BEGIN
  -- workspaces
  EXECUTE 'DROP POLICY IF EXISTS "workspaces_select_if_member" ON public.workspaces';
  EXECUTE 'DROP POLICY IF EXISTS "workspaces_insert_owner" ON public.workspaces';
  EXECUTE 'DROP POLICY IF EXISTS "workspaces_update_owner_or_admin" ON public.workspaces';

  EXECUTE 'CREATE POLICY "workspaces_select_if_member" ON public.workspaces FOR SELECT USING (public.is_workspace_member(id, auth.uid()))';
  EXECUTE 'CREATE POLICY "workspaces_insert_owner" ON public.workspaces FOR INSERT WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "workspaces_update_owner_or_admin" ON public.workspaces FOR UPDATE USING (owner_id = auth.uid() OR public.workspace_has_permission(id, ''workspace.settings.update'')) WITH CHECK (owner_id = auth.uid() OR public.workspace_has_permission(id, ''workspace.settings.update''))';

  -- workspace_members
  EXECUTE 'DROP POLICY IF EXISTS "workspace_members_select_if_same_workspace" ON public.workspace_members';
  EXECUTE 'CREATE POLICY "workspace_members_select_if_same_workspace" ON public.workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()))';

  -- workspace_invitations
  EXECUTE 'DROP POLICY IF EXISTS "workspace_invitations_select_if_member" ON public.workspace_invitations';
  EXECUTE 'CREATE POLICY "workspace_invitations_select_if_member" ON public.workspace_invitations FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()))';
END $$;

-- 6) workspace_id nas entidades principais
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.media_library ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.media_folders ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.media_tags ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- FKs condicionais
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automations_workspace_id_fkey') THEN
    ALTER TABLE public.automations
      ADD CONSTRAINT automations_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_workspace_id_fkey') THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_library_workspace_id_fkey') THEN
    ALTER TABLE public.media_library
      ADD CONSTRAINT media_library_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_folders_workspace_id_fkey') THEN
    ALTER TABLE public.media_folders
      ADD CONSTRAINT media_folders_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_tags_workspace_id_fkey') THEN
    ALTER TABLE public.media_tags
      ADD CONSTRAINT media_tags_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON public.automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_media_library_workspace_id ON public.media_library(workspace_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_workspace_id ON public.media_folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_workspace_id ON public.media_tags(workspace_id);

-- 7) Migração automática: 1 workspace padrão por usuário
WITH users_union AS (
  SELECT user_id FROM public.profiles
  UNION SELECT user_id FROM public.automations
  UNION SELECT user_id FROM public.contacts
  UNION SELECT user_id FROM public.media_library
  UNION SELECT user_id FROM public.media_folders
  UNION SELECT user_id FROM public.media_tags
)
INSERT INTO public.workspaces (name, slug, owner_id, plan_type)
SELECT
  'Meu Workspace' AS name,
  'ws-' || substring(u.user_id::text, 1, 8) AS slug,
  u.user_id AS owner_id,
  'free' AS plan_type
FROM users_union u
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.owner_id = u.user_id);

INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by)
SELECT w.id, w.owner_id, 'owner', w.owner_id
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);

UPDATE public.automations a
SET workspace_id = w.id
FROM public.workspaces w
WHERE a.workspace_id IS NULL AND w.owner_id = a.user_id;

UPDATE public.contacts c
SET workspace_id = w.id
FROM public.workspaces w
WHERE c.workspace_id IS NULL AND w.owner_id = c.user_id;

UPDATE public.media_library ml
SET workspace_id = w.id
FROM public.workspaces w
WHERE ml.workspace_id IS NULL AND w.owner_id = ml.user_id;

UPDATE public.media_folders mf
SET workspace_id = w.id
FROM public.workspaces w
WHERE mf.workspace_id IS NULL AND w.owner_id = mf.user_id;

UPDATE public.media_tags mt
SET workspace_id = w.id
FROM public.workspaces w
WHERE mt.workspace_id IS NULL AND w.owner_id = mt.user_id;

-- 8) RLS por workspace nas entidades
-- automations
DROP POLICY IF EXISTS "Users can view own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can create automations with permission" ON public.automations;
DROP POLICY IF EXISTS "Users can update own automations with permission" ON public.automations;
DROP POLICY IF EXISTS "Users can delete own automations with permission" ON public.automations;

DROP POLICY IF EXISTS "workspace_members_select_automations" ON public.automations;
DROP POLICY IF EXISTS "workspace_members_insert_automations" ON public.automations;
DROP POLICY IF EXISTS "workspace_members_update_automations" ON public.automations;
DROP POLICY IF EXISTS "workspace_members_delete_automations" ON public.automations;

CREATE POLICY "workspace_members_select_automations"
ON public.automations
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_members_insert_automations"
ON public.automations
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'automations.create')
);

CREATE POLICY "workspace_members_update_automations"
ON public.automations
FOR UPDATE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'automations.edit')
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'automations.edit')
);

CREATE POLICY "workspace_members_delete_automations"
ON public.automations
FOR DELETE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'automations.delete')
);

-- contacts
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;

DROP POLICY IF EXISTS "workspace_members_select_contacts" ON public.contacts;
DROP POLICY IF EXISTS "workspace_members_insert_contacts" ON public.contacts;
DROP POLICY IF EXISTS "workspace_members_update_contacts" ON public.contacts;
DROP POLICY IF EXISTS "workspace_members_delete_contacts" ON public.contacts;

CREATE POLICY "workspace_members_select_contacts"
ON public.contacts
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_members_insert_contacts"
ON public.contacts
FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_members_update_contacts"
ON public.contacts
FOR UPDATE
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_members_delete_contacts"
ON public.contacts
FOR DELETE
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- media_library
DROP POLICY IF EXISTS "Users can view own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can insert own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can update own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can delete own media" ON public.media_library;

DROP POLICY IF EXISTS "workspace_members_select_media" ON public.media_library;
DROP POLICY IF EXISTS "workspace_members_insert_media" ON public.media_library;
DROP POLICY IF EXISTS "workspace_members_update_media" ON public.media_library;
DROP POLICY IF EXISTS "workspace_members_delete_media" ON public.media_library;

CREATE POLICY "workspace_members_select_media"
ON public.media_library
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_members_insert_media"
ON public.media_library
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'media.upload')
);

CREATE POLICY "workspace_members_update_media"
ON public.media_library
FOR UPDATE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'media.manage')
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'media.manage')
);

CREATE POLICY "workspace_members_delete_media"
ON public.media_library
FOR DELETE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.workspace_has_permission(workspace_id, 'media.manage')
);
