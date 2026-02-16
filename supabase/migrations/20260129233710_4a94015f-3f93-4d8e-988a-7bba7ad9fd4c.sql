-- User storage quotas table
CREATE TABLE IF NOT EXISTS public.user_storage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_size_bytes BIGINT DEFAULT 0 NOT NULL,
  max_size_bytes BIGINT DEFAULT 5368709120 NOT NULL, -- 5GB
  file_count INTEGER DEFAULT 0 NOT NULL,
  max_file_count INTEGER DEFAULT 1000 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT user_storage_quotas_user_unique UNIQUE(user_id)
);

-- Helpful index for lookups
CREATE INDEX IF NOT EXISTS idx_user_storage_quotas_user_id
  ON public.user_storage_quotas(user_id);

-- RLS
ALTER TABLE public.user_storage_quotas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_storage_quotas'
      AND policyname = 'Users can view own quota'
  ) THEN
    CREATE POLICY "Users can view own quota"
      ON public.user_storage_quotas
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure updated_at is maintained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'user_storage_quotas_set_updated_at'
  ) THEN
    CREATE TRIGGER user_storage_quotas_set_updated_at
      BEFORE UPDATE ON public.user_storage_quotas
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helper function to ensure a quota row exists for a given user
CREATE OR REPLACE FUNCTION public.ensure_user_storage_quota(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_storage_quotas (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Trigger function to keep quotas in sync with media_library
CREATE OR REPLACE FUNCTION public.update_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    RETURN NULL;
  END IF;

  PERFORM public.ensure_user_storage_quota(v_user_id);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_storage_quotas
    SET
      total_size_bytes = total_size_bytes + COALESCE(NEW.file_size, 0),
      file_count = file_count + 1
    WHERE user_id = v_user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_storage_quotas
    SET
      total_size_bytes = GREATEST(total_size_bytes - COALESCE(OLD.file_size, 0), 0),
      file_count = GREATEST(file_count - 1, 0)
    WHERE user_id = v_user_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Attach trigger to media_library
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_media_library_change'
  ) THEN
    CREATE TRIGGER on_media_library_change
      AFTER INSERT OR DELETE ON public.media_library
      FOR EACH ROW EXECUTE FUNCTION public.update_storage_quota();
  END IF;
END $$;

-- Optionally, ensure quotas exist for existing profiles/users
-- (one-time backfill without touching auth schema)
INSERT INTO public.user_storage_quotas (user_id)
SELECT p.user_id
FROM public.profiles p
LEFT JOIN public.user_storage_quotas q ON q.user_id = p.user_id
WHERE q.user_id IS NULL;