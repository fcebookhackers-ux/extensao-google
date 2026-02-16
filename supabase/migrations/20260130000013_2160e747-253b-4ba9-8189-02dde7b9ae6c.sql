-- Webhook rate limiting + timeout configuration

-- 1) Per-webhook rate limit table
CREATE TABLE IF NOT EXISTS public.webhook_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_duration_seconds INTEGER NOT NULL DEFAULT 60,
  request_count INTEGER NOT NULL DEFAULT 0,
  max_requests INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(webhook_id, window_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_webhook ON public.webhook_rate_limit(webhook_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.webhook_rate_limit(window_start);

-- RLS
ALTER TABLE public.webhook_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON public.webhook_rate_limit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.webhooks
      WHERE public.webhooks.id = public.webhook_rate_limit.webhook_id
        AND public.webhooks.user_id = auth.uid()
    )
  );

-- 2) Add per-webhook config columns
ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER NOT NULL DEFAULT 10;

-- Keep timeout bounded (immutable constraint is OK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhooks_timeout_seconds_range'
  ) THEN
    ALTER TABLE public.webhooks
      ADD CONSTRAINT webhooks_timeout_seconds_range
      CHECK (timeout_seconds >= 1 AND timeout_seconds <= 30);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhooks_rate_limit_per_minute_range'
  ) THEN
    ALTER TABLE public.webhooks
      ADD CONSTRAINT webhooks_rate_limit_per_minute_range
      CHECK (rate_limit_per_minute >= 1 AND rate_limit_per_minute <= 1000);
  END IF;
END $$;

-- 3) Function: per-webhook rate limit check (minute window)
CREATE OR REPLACE FUNCTION public.check_webhook_rate_limit(p_webhook_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_window TIMESTAMPTZ;
  v_allowed BOOLEAN;
  v_row public.webhook_rate_limit%ROWTYPE;
  v_max_requests INT;
  v_window_seconds INT;
BEGIN
  v_current_window := date_trunc('minute', NOW());
  v_window_seconds := 60;

  -- Load per-webhook max from webhooks table (fallback 30)
  SELECT COALESCE(w.rate_limit_per_minute, 30)
    INTO v_max_requests
  FROM public.webhooks w
  WHERE w.id = p_webhook_id;

  IF v_max_requests IS NULL THEN
    v_max_requests := 30;
  END IF;

  -- Ensure row exists
  INSERT INTO public.webhook_rate_limit (
    webhook_id,
    window_start,
    window_duration_seconds,
    request_count,
    max_requests
  ) VALUES (
    p_webhook_id,
    v_current_window,
    v_window_seconds,
    0,
    v_max_requests
  )
  ON CONFLICT (webhook_id, window_start)
  DO UPDATE SET
    max_requests = EXCLUDED.max_requests;

  SELECT * INTO v_row
  FROM public.webhook_rate_limit
  WHERE webhook_id = p_webhook_id
    AND window_start = v_current_window;

  v_allowed := v_row.request_count < v_row.max_requests;

  IF v_allowed THEN
    UPDATE public.webhook_rate_limit
    SET request_count = request_count + 1
    WHERE webhook_id = p_webhook_id
      AND window_start = v_current_window
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_row.request_count,
    'max_requests', v_row.max_requests,
    'window_start', v_current_window,
    'window_end', v_current_window + INTERVAL '1 minute',
    'retry_after', CASE
      WHEN NOT v_allowed THEN GREATEST(0, EXTRACT(EPOCH FROM (v_current_window + INTERVAL '1 minute' - NOW()))::INTEGER)
      ELSE NULL
    END
  );
END;
$$;

-- 4) Cleanup function (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.webhook_rate_limit
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;