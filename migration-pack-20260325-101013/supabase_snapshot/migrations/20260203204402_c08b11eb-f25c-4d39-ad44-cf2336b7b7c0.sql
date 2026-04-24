-- WhatsApp Evolution API integration schema (ZapFllow)

-- ============================================
-- 1) PERMISSIONS: extend workspace_has_permission
-- ============================================
-- Adds:
-- - whatsapp.view
-- - whatsapp.manage
--
-- NOTE: Keeping existing behavior; only extending allowed permission sets.

CREATE OR REPLACE FUNCTION public.workspace_has_permission(
  p_workspace_id uuid,
  p_permission text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  r text;
  perm text;
begin
  perm := public.normalize_permission_name(p_permission);
  r := public.workspace_user_role(p_workspace_id, p_user_id);

  if r is null then
    return false;
  end if;

  if r = 'owner' then
    return true;
  end if;

  if r = 'admin' then
    return perm in (
      'workspace.settings.update',
      'members.invite',
      'members.remove',
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'contacts.delete',
      'automations.view',
      'automations.create',
      'automations.edit',
      'automations.delete',
      'webhooks.view',
      'webhooks.create',
      'webhooks.edit',
      'webhooks.manage',
      'media.view',
      'media.upload',
      'media.manage',
      'analytics.view',
      'analytics.create',
      'whatsapp.view',
      'whatsapp.manage'
    );
  end if;

  if r = 'member' then
    return perm in (
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'automations.view',
      'automations.create',
      'automations.edit',
      'webhooks.view',
      'webhooks.create',
      'webhooks.edit',
      'media.view',
      'media.upload',
      'analytics.view',
      'analytics.create',
      'whatsapp.view',
      'whatsapp.manage'
    );
  end if;

  if r = 'viewer' then
    return perm in (
      'contacts.view',
      'automations.view',
      'webhooks.view',
      'media.view',
      'analytics.view',
      'whatsapp.view'
    );
  end if;

  return false;
end;
$$;

-- ============================================
-- 2) TABLE: whatsapp_instances
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Evolution API identifiers
  instance_name text NOT NULL UNIQUE,
  evolution_instance_id text,

  qr_code text,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected','connecting','qr_ready','connected','error')),

  -- Connection metadata
  phone_number text,
  profile_name text,
  profile_picture_url text,

  -- Webhook configuration
  webhook_url text,
  webhook_events text[] NOT NULL DEFAULT ARRAY['QRCODE_UPDATED','CONNECTION_UPDATE','MESSAGES_UPSERT'],

  connected_at timestamptz,
  last_seen_at timestamptz,
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT one_instance_per_workspace UNIQUE (workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_workspace ON public.whatsapp_instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON public.whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_phone ON public.whatsapp_instances(phone_number) WHERE phone_number IS NOT NULL;

-- ============================================
-- 3) TABLE: whatsapp_messages
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Evolution/WhatsApp message identifiers
  message_id text NOT NULL,

  from_number text NOT NULL,
  to_number text NOT NULL,

  message_type text NOT NULL CHECK (message_type IN ('text','image','audio','video','document','sticker','location','contact')),
  content text,
  media_url text,
  media_mime_type text,

  timestamp timestamptz NOT NULL,
  is_from_me boolean NOT NULL DEFAULT false,

  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  automation_triggered boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_message_per_instance UNIQUE (whatsapp_instance_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON public.whatsapp_messages(whatsapp_instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact ON public.whatsapp_messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON public.whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_unprocessed ON public.whatsapp_messages(whatsapp_instance_id) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_workspace ON public.whatsapp_messages(workspace_id, created_at DESC);

-- ============================================
-- 4) TABLE: whatsapp_conversations
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','spam')),
  unread_count integer NOT NULL DEFAULT 0,

  last_message_content text,
  last_message_at timestamptz,
  last_message_from_me boolean,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_conversation UNIQUE (whatsapp_instance_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_instance ON public.whatsapp_conversations(whatsapp_instance_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_workspace ON public.whatsapp_conversations(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_unread ON public.whatsapp_conversations(workspace_id, unread_count DESC) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON public.whatsapp_conversations(status, updated_at DESC);

-- ============================================
-- 5) RLS
-- ============================================
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- whatsapp_instances
DROP POLICY IF EXISTS whatsapp_instances_select ON public.whatsapp_instances;
CREATE POLICY whatsapp_instances_select
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.view', workspace_id)
);

DROP POLICY IF EXISTS whatsapp_instances_insert ON public.whatsapp_instances;
CREATE POLICY whatsapp_instances_insert
ON public.whatsapp_instances
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
);

DROP POLICY IF EXISTS whatsapp_instances_update ON public.whatsapp_instances;
CREATE POLICY whatsapp_instances_update
ON public.whatsapp_instances
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
);

DROP POLICY IF EXISTS whatsapp_instances_delete ON public.whatsapp_instances;
CREATE POLICY whatsapp_instances_delete
ON public.whatsapp_instances
FOR DELETE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
);

-- whatsapp_messages
DROP POLICY IF EXISTS whatsapp_messages_select ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_select
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.view', workspace_id)
);

DROP POLICY IF EXISTS whatsapp_messages_insert ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_insert
ON public.whatsapp_messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
);

-- whatsapp_conversations
DROP POLICY IF EXISTS whatsapp_conversations_select ON public.whatsapp_conversations;
CREATE POLICY whatsapp_conversations_select
ON public.whatsapp_conversations
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.view', workspace_id)
);

DROP POLICY IF EXISTS whatsapp_conversations_manage ON public.whatsapp_conversations;
CREATE POLICY whatsapp_conversations_manage
ON public.whatsapp_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
);

DROP POLICY IF EXISTS whatsapp_conversations_update ON public.whatsapp_conversations;
CREATE POLICY whatsapp_conversations_update
ON public.whatsapp_conversations
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
);

DROP POLICY IF EXISTS whatsapp_conversations_delete ON public.whatsapp_conversations;
CREATE POLICY whatsapp_conversations_delete
ON public.whatsapp_conversations
FOR DELETE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.has_permission('whatsapp.manage', workspace_id)
);

-- ============================================
-- 6) TRIGGERS: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_whatsapp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_conversations_updated_at ON public.whatsapp_conversations;
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_whatsapp_updated_at();

-- ============================================
-- 7) SQL FUNCTIONS (optional helpers)
-- ============================================
-- These functions are safe to call from Edge Functions using service_role
-- (PostgREST sets request.jwt.claim.role to 'service_role').

CREATE OR REPLACE FUNCTION public.upsert_contact_from_whatsapp(
  p_workspace_id uuid,
  p_phone text,
  p_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contact_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' AND v_role IS DISTINCT FROM 'supabase_admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Find existing contact by (workspace_id, phone)
  SELECT c.id INTO v_contact_id
  FROM public.contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.phone = p_phone
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO public.contacts (workspace_id, user_id, phone, name)
    VALUES (
      p_workspace_id,
      -- Fallback: keep compatibility where contacts require user_id; caller should set claims.sub when possible.
      COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid, gen_random_uuid()),
      p_phone,
      COALESCE(p_name, 'Contato ' || left(p_phone, 8))
    )
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE public.contacts
    SET name = COALESCE(p_name, name),
        updated_at = now()
    WHERE id = v_contact_id;
  END IF;

  RETURN v_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_whatsapp_conversation(
  p_whatsapp_instance_id uuid,
  p_workspace_id uuid,
  p_contact_id uuid,
  p_last_message_content text,
  p_last_message_from_me boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversation_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' AND v_role IS DISTINCT FROM 'supabase_admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.whatsapp_conversations (
    whatsapp_instance_id,
    workspace_id,
    contact_id,
    last_message_content,
    last_message_at,
    last_message_from_me,
    unread_count
  ) VALUES (
    p_whatsapp_instance_id,
    p_workspace_id,
    p_contact_id,
    p_last_message_content,
    now(),
    p_last_message_from_me,
    CASE WHEN p_last_message_from_me THEN 0 ELSE 1 END
  )
  ON CONFLICT (whatsapp_instance_id, contact_id)
  DO UPDATE SET
    last_message_content = EXCLUDED.last_message_content,
    last_message_at = EXCLUDED.last_message_at,
    last_message_from_me = EXCLUDED.last_message_from_me,
    unread_count = CASE
      WHEN EXCLUDED.last_message_from_me THEN public.whatsapp_conversations.unread_count
      ELSE public.whatsapp_conversations.unread_count + 1
    END,
    updated_at = now()
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  -- Allow service_role (server) OR authenticated users with permission.
  IF v_role = 'service_role' OR v_role = 'supabase_admin' THEN
    UPDATE public.whatsapp_conversations
    SET unread_count = 0,
        updated_at = now()
    WHERE id = p_conversation_id;
    RETURN;
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.whatsapp_conversations
  WHERE id = p_conversation_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF NOT public.is_workspace_member(v_workspace_id, auth.uid()) OR NOT public.has_permission('whatsapp.manage', v_workspace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.whatsapp_conversations
  SET unread_count = 0,
      updated_at = now()
  WHERE id = p_conversation_id;
END;
$$;
