-- Fix LGPD RLS policies: user_id is UUID (compare uuid to uuid)

-- 1) data_export_requests
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_export_requests' AND policyname = 'Users can view own export requests'
  ) THEN
    CREATE POLICY "Users can view own export requests"
    ON public.data_export_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_export_requests' AND policyname = 'Users can create own export requests'
  ) THEN
    CREATE POLICY "Users can create own export requests"
    ON public.data_export_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2) data_deletion_requests
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_deletion_requests' AND policyname = 'Users can view own deletion requests'
  ) THEN
    CREATE POLICY "Users can view own deletion requests"
    ON public.data_deletion_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_deletion_requests' AND policyname = 'Users can create own deletion requests'
  ) THEN
    CREATE POLICY "Users can create own deletion requests"
    ON public.data_deletion_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3) consent_history
ALTER TABLE public.consent_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'consent_history' AND policyname = 'Users can view own consent history'
  ) THEN
    CREATE POLICY "Users can view own consent history"
    ON public.consent_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'consent_history' AND policyname = 'Users can insert own consent history'
  ) THEN
    CREATE POLICY "Users can insert own consent history"
    ON public.consent_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4) policy_versions (public read)
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'policy_versions' AND policyname = 'Policy versions are readable by everyone'
  ) THEN
    CREATE POLICY "Policy versions are readable by everyone"
    ON public.policy_versions
    FOR SELECT
    USING (true);
  END IF;
END $$;
