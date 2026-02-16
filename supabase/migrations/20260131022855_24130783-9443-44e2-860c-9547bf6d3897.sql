-- Allow users to read their own rate limit events (needed for configurable alerts)
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='rate_limit_events' AND policyname='Users can view own rate limit events'
  ) THEN
    CREATE POLICY "Users can view own rate limit events"
    ON public.rate_limit_events
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;
