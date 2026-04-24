-- LGPD consent management (user_consents) + RLS + safe RPCs

-- 1) Table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL, -- analytics | marketing | third_party
  granted boolean NOT NULL,
  granted_at timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure idempotent index
CREATE INDEX IF NOT EXISTS idx_user_consents_user_type ON public.user_consents(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_time ON public.user_consents(user_id, created_at DESC);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- 2) RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_consents' AND policyname='Users can view own consents'
  ) THEN
    CREATE POLICY "Users can view own consents"
    ON public.user_consents
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_consents' AND policyname='Users can insert own consents'
  ) THEN
    CREATE POLICY "Users can insert own consents"
    ON public.user_consents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3) Helper: allow-list for consent types
CREATE OR REPLACE FUNCTION public.is_allowed_consent_type(p_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_type IN ('analytics','marketing','third_party');
$$;

-- 4) RPC: update consent (append-only history)
CREATE OR REPLACE FUNCTION public.update_user_consent(p_consent_type text, p_granted boolean, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_allowed_consent_type(p_consent_type) THEN
    RAISE EXCEPTION 'Tipo de consentimento inválido';
  END IF;

  INSERT INTO public.user_consents (
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    p_consent_type,
    p_granted,
    CASE WHEN p_granted THEN now() ELSE NULL END,
    CASE WHEN NOT p_granted THEN now() ELSE NULL END,
    inet_client_addr()::text,
    current_setting('request.header.user-agent', true),
    COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_id;

  PERFORM public.log_audit_event(
    'consent.updated',
    'consent',
    v_id,
    jsonb_build_object('consent_type', p_consent_type, 'granted', p_granted)
  );

  RETURN v_id;
END;
$$;

-- 5) RPC: revoke all (analytics/marketing/third_party)
CREATE OR REPLACE FUNCTION public.revoke_all_consents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_types text[] := ARRAY['analytics','marketing','third_party'];
  v_t text;
  v_revoked integer := 0;
  v_last_id uuid;
BEGIN
  FOREACH v_t IN ARRAY v_types LOOP
    v_last_id := public.update_user_consent(v_t, false, jsonb_build_object('reason','bulk_revoke'));
    v_revoked := v_revoked + 1;
  END LOOP;

  RETURN jsonb_build_object('revoked', v_revoked);
END;
$$;
