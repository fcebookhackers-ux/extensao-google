-- PRIVACY HUB (LGPD): export requests, deletion requests, consent history, policy versions

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  download_url TEXT,
  file_size_bytes BIGINT,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  reason TEXT,
  backup_location TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  UNIQUE(policy_type, version)
);

-- 2) Constraints (status enums as CHECK - immutable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'data_export_requests_status_check'
  ) THEN
    ALTER TABLE public.data_export_requests
      ADD CONSTRAINT data_export_requests_status_check
      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'data_deletion_requests_status_check'
  ) THEN
    ALTER TABLE public.data_deletion_requests
      ADD CONSTRAINT data_deletion_requests_status_check
      CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'cancelled'));
  END IF;
END $$;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_export_user_status
  ON public.data_export_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_export_expires
  ON public.data_export_requests(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deletion_user_status
  ON public.data_deletion_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_deletion_scheduled
  ON public.data_deletion_requests(scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_consent_user_type
  ON public.consent_history(user_id, consent_type, granted_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_granted
  ON public.consent_history(granted_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_type_effective
  ON public.policy_versions(policy_type, effective_from DESC);

-- 4) Seed policy versions
INSERT INTO public.policy_versions (policy_type, version, content, created_by)
VALUES
  ('terms_of_service', '1.0', 'Termos de Serviço versão 1.0', NULL),
  ('privacy_policy', '1.0', 'Política de Privacidade versão 1.0', NULL),
  ('cookie_policy', '1.0', 'Política de Cookies versão 1.0', NULL)
ON CONFLICT (policy_type, version) DO NOTHING;

-- 5) RPC functions
CREATE OR REPLACE FUNCTION public.request_data_export()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_id UUID;
  pending_count INT;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM public.data_export_requests
  WHERE user_id = auth.uid()
    AND status IN ('pending', 'processing')
    AND requested_at > NOW() - INTERVAL '24 hours';

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'Você já possui uma solicitação de exportação pendente';
  END IF;

  INSERT INTO public.data_export_requests (user_id, status)
  VALUES (auth.uid(), 'pending')
  RETURNING id INTO request_id;

  PERFORM public.log_audit_event(
    'data.export_requested',
    'export',
    request_id
  );

  -- Optional: notify external worker
  PERFORM pg_notify('data_export_requested', request_id::text);

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_account_deletion(
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_id UUID;
  scheduled_date TIMESTAMPTZ;
BEGIN
  scheduled_date := NOW() + INTERVAL '30 days';

  INSERT INTO public.data_deletion_requests (
    user_id,
    reason,
    scheduled_for,
    status
  ) VALUES (
    auth.uid(),
    p_reason,
    scheduled_date,
    'scheduled'
  )
  RETURNING id INTO request_id;

  PERFORM public.log_audit_event(
    'data.deletion_requested',
    'deletion',
    request_id,
    jsonb_build_object('scheduled_for', scheduled_date)
  );

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(
  p_request_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.data_deletion_requests
  SET status = 'cancelled',
      cancelled_at = NOW()
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou já processada';
  END IF;

  PERFORM public.log_audit_event(
    'data.deletion_cancelled',
    'deletion',
    p_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_consent(
  p_consent_type TEXT,
  p_policy_version TEXT,
  p_granted BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  consent_id UUID;
BEGIN
  INSERT INTO public.consent_history (
    user_id,
    consent_type,
    policy_version,
    granted,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    p_consent_type,
    p_policy_version,
    p_granted,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    jsonb_build_object('timestamp', NOW())
  )
  RETURNING id INTO consent_id;

  RETURN consent_id;
END;
$$;

-- 6) RLS
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

-- Users can view own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_export_requests' AND policyname='users_select_own_export_requests'
  ) THEN
    CREATE POLICY users_select_own_export_requests
    ON public.data_export_requests
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_deletion_requests' AND policyname='users_select_own_deletion_requests'
  ) THEN
    CREATE POLICY users_select_own_deletion_requests
    ON public.data_deletion_requests
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='consent_history' AND policyname='users_select_own_consent_history'
  ) THEN
    CREATE POLICY users_select_own_consent_history
    ON public.consent_history
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='policy_versions' AND policyname='public_select_policy_versions'
  ) THEN
    CREATE POLICY public_select_policy_versions
    ON public.policy_versions
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Admins can view all export requests + manage (update)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_export_requests' AND policyname='admins_select_all_export_requests'
  ) THEN
    CREATE POLICY admins_select_all_export_requests
    ON public.data_export_requests
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_export_requests' AND policyname='admins_update_export_requests'
  ) THEN
    CREATE POLICY admins_update_export_requests
    ON public.data_export_requests
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;
