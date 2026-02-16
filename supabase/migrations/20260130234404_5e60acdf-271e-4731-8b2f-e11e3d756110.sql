-- cleanup_metrics: explicit RLS policies (service role only)
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cleanup_metrics'
      AND policyname = 'Service role can read cleanup metrics'
  ) THEN
    CREATE POLICY "Service role can read cleanup metrics"
    ON public.cleanup_metrics
    FOR SELECT
    USING (auth.role() = 'service_role');
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cleanup_metrics'
      AND policyname = 'Service role can insert cleanup metrics'
  ) THEN
    CREATE POLICY "Service role can insert cleanup metrics"
    ON public.cleanup_metrics
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cleanup_metrics'
      AND policyname = 'Service role can update cleanup metrics'
  ) THEN
    CREATE POLICY "Service role can update cleanup metrics"
    ON public.cleanup_metrics
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cleanup_metrics'
      AND policyname = 'Service role can delete cleanup metrics'
  ) THEN
    CREATE POLICY "Service role can delete cleanup metrics"
    ON public.cleanup_metrics
    FOR DELETE
    USING (auth.role() = 'service_role');
  END IF;
END $$;