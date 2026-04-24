-- Webhook retry queue + config + worker helpers

-- 1) Enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retry_status') THEN
    CREATE TYPE public.retry_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'exhausted');
  END IF;
END $$;

-- 2) Retry config table (per webhook)
CREATE TABLE IF NOT EXISTS public.webhook_retry_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID UNIQUE NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  initial_delay_seconds INTEGER NOT NULL DEFAULT 60,
  max_delay_seconds INTEGER NOT NULL DEFAULT 3600,
  backoff_multiplier NUMERIC(6,2) NOT NULL DEFAULT 2.0,
  retry_on_status_codes INTEGER[] NOT NULL DEFAULT ARRAY[408, 429, 500, 502, 503, 504],
  stop_on_status_codes INTEGER[] NOT NULL DEFAULT ARRAY[400, 401, 403, 404, 410],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook_retry_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_retry_config' AND policyname = 'Users can manage retry config of own webhooks'
  ) THEN
    CREATE POLICY "Users can manage retry config of own webhooks"
      ON public.webhook_retry_config
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.webhooks w
          WHERE w.id = webhook_retry_config.webhook_id
            AND w.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.webhooks w
          WHERE w.id = webhook_retry_config.webhook_id
            AND w.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3) Retry queue table
CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  webhook_log_id UUID NULL REFERENCES public.webhook_logs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  status public.retry_status NOT NULL DEFAULT 'pending',
  next_retry_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_queue_webhook ON public.webhook_retry_queue(webhook_id);
CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON public.webhook_retry_queue(status);
CREATE INDEX IF NOT EXISTS idx_retry_queue_next_retry
  ON public.webhook_retry_queue(next_retry_at)
  WHERE status = 'pending';

ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_retry_queue' AND policyname = 'Users can view retry queue of own webhooks'
  ) THEN
    CREATE POLICY "Users can view retry queue of own webhooks"
      ON public.webhook_retry_queue
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.webhooks w
          WHERE w.id = webhook_retry_queue.webhook_id
            AND w.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4) updated_at trigger function already exists (public.update_updated_at_column)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_webhook_retry_config_updated_at'
  ) THEN
    CREATE TRIGGER set_webhook_retry_config_updated_at
    BEFORE UPDATE ON public.webhook_retry_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_webhook_retry_queue_updated_at'
  ) THEN
    CREATE TRIGGER set_webhook_retry_queue_updated_at
    BEFORE UPDATE ON public.webhook_retry_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) Helper: calculate next retry (backoff + jitter)
CREATE OR REPLACE FUNCTION public.calculate_next_retry(
  p_attempt_number INTEGER,
  p_initial_delay INTEGER,
  p_max_delay INTEGER,
  p_multiplier NUMERIC
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delay NUMERIC;
  v_jitter NUMERIC;
  v_final_delay NUMERIC;
BEGIN
  IF p_attempt_number < 1 THEN
    p_attempt_number := 1;
  END IF;

  v_delay := LEAST(
    (p_initial_delay::numeric * POWER(p_multiplier::numeric, (p_attempt_number - 1))::numeric),
    p_max_delay::numeric
  );

  -- jitter ±20%
  v_jitter := (RANDOM() * 0.4 - 0.2) * v_delay;
  v_final_delay := GREATEST(0, v_delay + v_jitter);

  RETURN NOW() + make_interval(secs => v_final_delay);
END;
$$;

-- 6) Enqueue retry (decides retry vs stop) - returns retry_id or NULL
CREATE OR REPLACE FUNCTION public.enqueue_webhook_retry(
  p_webhook_id UUID,
  p_webhook_log_id UUID,
  p_event_type TEXT,
  p_payload JSONB,
  p_status_code INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config public.webhook_retry_config%ROWTYPE;
  v_should_retry BOOLEAN := FALSE;
  v_retry_id UUID;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Ensure config exists (idempotent)
  INSERT INTO public.webhook_retry_config (webhook_id)
  VALUES (p_webhook_id)
  ON CONFLICT (webhook_id) DO NOTHING;

  SELECT * INTO v_config
  FROM public.webhook_retry_config
  WHERE webhook_id = p_webhook_id;

  -- Decide retry
  IF p_status_code IS NULL THEN
    v_should_retry := TRUE; -- network/timeout
  ELSIF p_status_code = ANY(v_config.stop_on_status_codes) THEN
    v_should_retry := FALSE;
  ELSIF p_status_code = ANY(v_config.retry_on_status_codes) THEN
    v_should_retry := TRUE;
  ELSIF p_status_code >= 500 THEN
    v_should_retry := TRUE;
  ELSE
    v_should_retry := FALSE;
  END IF;

  IF NOT v_should_retry THEN
    RETURN NULL;
  END IF;

  v_next_retry := public.calculate_next_retry(
    1,
    v_config.initial_delay_seconds,
    v_config.max_delay_seconds,
    v_config.backoff_multiplier
  );

  INSERT INTO public.webhook_retry_queue (
    webhook_id,
    webhook_log_id,
    event_type,
    payload,
    attempt_number,
    max_attempts,
    status,
    next_retry_at,
    last_error
  ) VALUES (
    p_webhook_id,
    p_webhook_log_id,
    p_event_type,
    p_payload,
    1,
    v_config.max_attempts,
    'pending',
    v_next_retry,
    p_error_message
  )
  RETURNING id INTO v_retry_id;

  RETURN v_retry_id;
END;
$$;

-- 7) Claim pending retries with SKIP LOCKED (returns updated rows)
CREATE OR REPLACE FUNCTION public.get_pending_retries(p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.webhook_retry_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.webhook_retry_queue
  SET status = 'processing',
      updated_at = NOW()
  WHERE id IN (
    SELECT id
    FROM public.webhook_retry_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      AND attempt_number <= max_attempts
    ORDER BY COALESCE(next_retry_at, created_at) ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- 8) Process retry result
CREATE OR REPLACE FUNCTION public.process_retry_result(
  p_retry_id UUID,
  p_success BOOLEAN,
  p_status_code INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_retry public.webhook_retry_queue%ROWTYPE;
  v_config public.webhook_retry_config%ROWTYPE;
  v_next_retry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_retry
  FROM public.webhook_retry_queue
  WHERE id = p_retry_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_config
  FROM public.webhook_retry_config
  WHERE webhook_id = v_retry.webhook_id;

  IF p_success THEN
    UPDATE public.webhook_retry_queue
    SET status = 'succeeded',
        last_error = NULL,
        updated_at = NOW()
    WHERE id = p_retry_id;

    IF v_retry.webhook_log_id IS NOT NULL THEN
      UPDATE public.webhook_logs
      SET
        response_status = p_status_code,
        response_body = p_response_body,
        error_message = NULL,
        success = TRUE,
        attempt_number = v_retry.attempt_number,
        executed_at = NOW()
      WHERE id = v_retry.webhook_log_id;
    END IF;

    RETURN;
  END IF;

  -- failure
  IF v_retry.attempt_number >= v_retry.max_attempts THEN
    UPDATE public.webhook_retry_queue
    SET status = 'exhausted',
        last_error = p_error_message,
        updated_at = NOW()
    WHERE id = p_retry_id;

    IF v_retry.webhook_log_id IS NOT NULL THEN
      UPDATE public.webhook_logs
      SET
        response_status = p_status_code,
        response_body = p_response_body,
        error_message = COALESCE(p_error_message, 'Retry exhausted'),
        success = FALSE,
        attempt_number = v_retry.attempt_number,
        executed_at = NOW()
      WHERE id = v_retry.webhook_log_id;
    END IF;

    RETURN;
  END IF;

  IF p_status_code IS NOT NULL AND p_status_code = ANY(v_config.stop_on_status_codes) THEN
    UPDATE public.webhook_retry_queue
    SET status = 'failed',
        last_error = p_error_message,
        updated_at = NOW()
    WHERE id = p_retry_id;

    IF v_retry.webhook_log_id IS NOT NULL THEN
      UPDATE public.webhook_logs
      SET
        response_status = p_status_code,
        response_body = p_response_body,
        error_message = COALESCE(p_error_message, 'Permanent error'),
        success = FALSE,
        attempt_number = v_retry.attempt_number,
        executed_at = NOW()
      WHERE id = v_retry.webhook_log_id;
    END IF;

    RETURN;
  END IF;

  v_next_retry := public.calculate_next_retry(
    v_retry.attempt_number + 1,
    v_config.initial_delay_seconds,
    v_config.max_delay_seconds,
    v_config.backoff_multiplier
  );

  UPDATE public.webhook_retry_queue
  SET status = 'pending',
      attempt_number = attempt_number + 1,
      next_retry_at = v_next_retry,
      last_error = p_error_message,
      updated_at = NOW()
  WHERE id = p_retry_id;

  IF v_retry.webhook_log_id IS NOT NULL THEN
    UPDATE public.webhook_logs
    SET
      response_status = p_status_code,
      response_body = p_response_body,
      error_message = p_error_message,
      success = FALSE,
      attempt_number = v_retry.attempt_number,
      executed_at = NOW()
    WHERE id = v_retry.webhook_log_id;
  END IF;
END;
$$;

-- 9) Cleanup old retries (>30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_retries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.webhook_retry_queue
  WHERE status IN ('succeeded', 'failed', 'exhausted')
    AND updated_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;