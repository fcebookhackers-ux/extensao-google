-- Queue table for webhook deliveries (jobs)
CREATE TABLE IF NOT EXISTS public.webhook_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz NULL,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  completed_at timestamptz NULL
);

-- Allowed statuses (NOT time-based; safe as CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhook_jobs_status_check'
  ) THEN
    ALTER TABLE public.webhook_jobs
      ADD CONSTRAINT webhook_jobs_status_check
      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead'));
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_webhook_jobs_webhook_id
  ON public.webhook_jobs (webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhook_jobs_pending_next_retry
  ON public.webhook_jobs (status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_webhook_jobs_created_at
  ON public.webhook_jobs (created_at);

-- Enable RLS
ALTER TABLE public.webhook_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view jobs for webhooks they can access (owner/workspace member)
DROP POLICY IF EXISTS webhook_jobs_select ON public.webhook_jobs;
CREATE POLICY webhook_jobs_select
ON public.webhook_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.webhooks w
    WHERE w.id = webhook_jobs.webhook_id
      AND (
        (w.user_id = auth.uid()) OR
        (w.workspace_id IS NOT NULL AND is_workspace_member(w.workspace_id, auth.uid()) AND has_permission('webhooks.view'::text, w.workspace_id))
      )
  )
);

-- Users can request a retry (update only) for jobs they can access
DROP POLICY IF EXISTS webhook_jobs_update_retry ON public.webhook_jobs;
CREATE POLICY webhook_jobs_update_retry
ON public.webhook_jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.webhooks w
    WHERE w.id = webhook_jobs.webhook_id
      AND (
        (w.user_id = auth.uid()) OR
        (w.workspace_id IS NOT NULL AND is_workspace_member(w.workspace_id, auth.uid()) AND has_permission('webhooks.edit'::text, w.workspace_id))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.webhooks w
    WHERE w.id = webhook_jobs.webhook_id
      AND (
        (w.user_id = auth.uid()) OR
        (w.workspace_id IS NOT NULL AND is_workspace_member(w.workspace_id, auth.uid()) AND has_permission('webhooks.edit'::text, w.workspace_id))
      )
  )
);

-- No direct inserts/deletes from clients (worker uses service_role)

-- Claim pending jobs safely (used by worker) - SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.claim_webhook_jobs(p_limit integer DEFAULT 10)
RETURNS SETOF public.webhook_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.webhook_jobs
  SET status = 'processing',
      started_at = COALESCE(started_at, now())
  WHERE id IN (
    SELECT id
    FROM public.webhook_jobs
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY COALESCE(next_retry_at, created_at) ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Enqueue a job (used by authenticated app flows or internal logic)
CREATE OR REPLACE FUNCTION public.enqueue_webhook_job(
  p_webhook_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_max_retries integer DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  INSERT INTO public.webhook_jobs (
    webhook_id,
    event_type,
    payload,
    status,
    retry_count,
    max_retries,
    next_retry_at
  ) VALUES (
    p_webhook_id,
    p_event_type,
    p_payload,
    'pending',
    0,
    LEAST(GREATEST(COALESCE(p_max_retries, 5), 0), 25),
    now()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

-- Purge dead jobs older than N days (service role / worker)
CREATE OR REPLACE FUNCTION public.purge_dead_webhook_jobs(p_older_than_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.webhook_jobs
  WHERE status = 'dead'
    AND created_at < now() - (LEAST(GREATEST(p_older_than_days, 1), 365) || ' days')::interval;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;