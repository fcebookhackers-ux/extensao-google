-- RATE LIMITING: schema + functions + RLS

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  max_requests INTEGER NOT NULL DEFAULT 10,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger (reuses existing helper)
DROP TRIGGER IF EXISTS update_rate_limit_config_updated_at ON public.rate_limit_config;
CREATE TRIGGER update_rate_limit_config_updated_at
BEFORE UPDATE ON public.rate_limit_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint_time
  ON public.rate_limit_events(user_id, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint_time
  ON public.rate_limit_events(ip_address, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_created
  ON public.rate_limit_events(created_at DESC);

-- 3) Default configs
INSERT INTO public.rate_limit_config (endpoint, max_requests, window_seconds, description) VALUES
  ('auth.login', 5, 300, 'Login attempts - 5 per 5 minutes'),
  ('auth.signup', 3, 3600, 'Signup attempts - 3 per hour'),
  ('auth.password_reset', 3, 3600, 'Password reset requests - 3 per hour'),
  ('contacts.import', 5, 3600, 'Contact imports - 5 per hour'),
  ('contacts.export', 10, 3600, 'Contact exports - 10 per hour'),
  ('automations.publish', 20, 3600, 'Automation publishes - 20 per hour'),
  ('team.invite', 10, 86400, 'Team invites - 10 per day'),
  ('webhook.trigger', 100, 60, 'Webhook triggers - 100 per minute'),
  ('api.general', 1000, 3600, 'General API calls - 1000 per hour')
ON CONFLICT (endpoint) DO NOTHING;

-- 4) Functions
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint TEXT,
  p_custom_max_requests INT DEFAULT NULL,
  p_custom_window_seconds INT DEFAULT NULL
) RETURNS TABLE(allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_requests INT;
  v_window_seconds INT;
  v_window_start TIMESTAMPTZ;
  v_request_count INT;
  v_user_id UUID;
  v_ip_address INET;
BEGIN
  -- Load config unless both custom limits are provided
  IF p_custom_max_requests IS NULL OR p_custom_window_seconds IS NULL THEN
    SELECT max_requests, window_seconds
      INTO v_max_requests, v_window_seconds
    FROM public.rate_limit_config
    WHERE endpoint = p_endpoint;

    IF v_max_requests IS NULL THEN
      v_max_requests := COALESCE(p_custom_max_requests, 100);
      v_window_seconds := COALESCE(p_custom_window_seconds, 3600);
    END IF;
  ELSE
    v_max_requests := p_custom_max_requests;
    v_window_seconds := p_custom_window_seconds;
  END IF;

  v_user_id := auth.uid();
  v_ip_address := inet_client_addr();
  v_window_start := NOW() - (v_window_seconds || ' seconds')::INTERVAL;

  -- If unauthenticated, rate-limit by IP only (best-effort)
  SELECT COUNT(*) INTO v_request_count
  FROM public.rate_limit_events
  WHERE endpoint = p_endpoint
    AND created_at > v_window_start
    AND (
      (v_user_id IS NOT NULL AND user_id = v_user_id)
      OR (v_user_id IS NULL AND ip_address = v_ip_address)
    );

  IF v_request_count >= v_max_requests THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      (v_window_start + (v_window_seconds || ' seconds')::INTERVAL);
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_events (user_id, ip_address, endpoint)
  VALUES (v_user_id, v_ip_address, p_endpoint);

  RETURN QUERY SELECT
    TRUE,
    (v_max_requests - v_request_count - 1),
    (v_window_start + (v_window_seconds || ' seconds')::INTERVAL);
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limit_events
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 5) RLS
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read rate limit events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='rate_limit_events' AND policyname='admins_select_rate_limit_events'
  ) THEN
    CREATE POLICY admins_select_rate_limit_events
    ON public.rate_limit_events
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Config: everyone can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='rate_limit_config' AND policyname='public_select_rate_limit_config'
  ) THEN
    CREATE POLICY public_select_rate_limit_config
    ON public.rate_limit_config
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Config: admins can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='rate_limit_config' AND policyname='admins_manage_rate_limit_config'
  ) THEN
    CREATE POLICY admins_manage_rate_limit_config
    ON public.rate_limit_config
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Note: no direct INSERT into rate_limit_events; it is written by SECURITY DEFINER function.
