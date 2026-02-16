-- Rate limiting v2 (workspace/user/ip aware) - does NOT modify existing rate_limit_config/events

CREATE TABLE IF NOT EXISTS public.rate_limit_rules_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  limit_type text NOT NULL,
  max_requests integer NOT NULL,
  window_seconds integer NOT NULL,
  tier text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_rules_v2_limit_type_check CHECK (limit_type IN ('per_user', 'per_workspace', 'per_ip')),
  CONSTRAINT rate_limit_rules_v2_unique UNIQUE (endpoint, limit_type, tier)
);

CREATE TABLE IF NOT EXISTS public.rate_limit_counters_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.rate_limit_rules_v2(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_counters_v2_unique UNIQUE (rule_id, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_v2_lookup
  ON public.rate_limit_counters_v2(endpoint, identifier, window_start);

ALTER TABLE public.rate_limit_rules_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_counters_v2 ENABLE ROW LEVEL SECURITY;

-- Service role manages
DO $$ BEGIN
  CREATE POLICY "service_role_manage_rate_limit_rules_v2"
  ON public.rate_limit_rules_v2
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_manage_rate_limit_counters_v2"
  ON public.rate_limit_counters_v2
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins can read
DO $$ BEGIN
  CREATE POLICY "admins_select_rate_limit_rules_v2"
  ON public.rate_limit_rules_v2
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admins_select_rate_limit_counters_v2"
  ON public.rate_limit_counters_v2
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Timestamp trigger helper (reuse if exists; create if missing)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rate_limit_rules_v2_updated_at ON public.rate_limit_rules_v2;
CREATE TRIGGER trg_rate_limit_rules_v2_updated_at
BEFORE UPDATE ON public.rate_limit_rules_v2
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_rate_limit_counters_v2_updated_at ON public.rate_limit_counters_v2;
CREATE TRIGGER trg_rate_limit_counters_v2_updated_at
BEFORE UPDATE ON public.rate_limit_counters_v2
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RPC
CREATE OR REPLACE FUNCTION public.check_rate_limit_v2(
  p_endpoint text,
  p_limit_type text,
  p_identifier text,
  p_tier text DEFAULT 'free'
)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.rate_limit_rules_v2%ROWTYPE;
  v_window_start timestamptz;
  v_current_count integer;
BEGIN
  IF p_limit_type NOT IN ('per_user','per_workspace','per_ip') THEN
    RAISE EXCEPTION 'Invalid limit_type: %', p_limit_type;
  END IF;

  SELECT * INTO v_rule
  FROM public.rate_limit_rules_v2
  WHERE endpoint = p_endpoint
    AND limit_type = p_limit_type
    AND is_active = true
    AND (tier = p_tier OR tier IS NULL)
  ORDER BY (tier IS NULL) ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 999999, now() + interval '1 hour';
    RETURN;
  END IF;

  v_window_start := date_trunc('second', now()) -
    ((extract(epoch from now())::integer % v_rule.window_seconds) * interval '1 second');

  INSERT INTO public.rate_limit_counters_v2 (rule_id, identifier, endpoint, window_start)
  VALUES (v_rule.id, p_identifier, p_endpoint, v_window_start)
  ON CONFLICT (rule_id, identifier, window_start)
  DO UPDATE SET request_count = public.rate_limit_counters_v2.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN QUERY
    SELECT
      (v_current_count <= v_rule.max_requests) AS allowed,
      greatest(0, v_rule.max_requests - v_current_count) AS remaining,
      v_window_start + (v_rule.window_seconds * interval '1 second') AS reset_at;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit_v2(text, text, text, text) FROM PUBLIC;

-- Seed rules (idempotent)
INSERT INTO public.rate_limit_rules_v2 (endpoint, limit_type, max_requests, window_seconds, tier)
VALUES
  ('upload', 'per_workspace', 100, 3600, 'free'),
  ('execute-webhook', 'per_workspace', 500, 3600, 'free'),
  ('validate-upload', 'per_workspace', 100, 3600, 'free'),
  ('process-data-export', 'per_user', 10, 3600, 'free'),
  ('simulate-automation', 'per_user', 60, 3600, 'free')
ON CONFLICT (endpoint, limit_type, tier) DO NOTHING;