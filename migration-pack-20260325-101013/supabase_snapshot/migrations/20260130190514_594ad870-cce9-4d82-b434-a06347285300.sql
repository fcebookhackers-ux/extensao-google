-- Export system (jobs + functions + storage bucket)

-- Enums
DO $$ BEGIN
  CREATE TYPE public.export_format AS ENUM ('csv', 'json', 'pdf', 'xlsx');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL,
  format public.export_format NOT NULL,
  status public.export_status NOT NULL DEFAULT 'pending',
  filters JSONB,
  file_url TEXT,
  file_size BIGINT,
  records_count INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON public.export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON public.export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_expires ON public.export_jobs(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own export jobs"
    ON public.export_jobs
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create export jobs"
    ON public.export_jobs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Functions
CREATE OR REPLACE FUNCTION public.create_export_job(
  p_export_type TEXT,
  p_format public.export_format,
  p_filters JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.export_jobs (
    user_id,
    export_type,
    format,
    filters,
    expires_at
  ) VALUES (
    auth.uid(),
    p_export_type,
    p_format,
    p_filters,
    now() + interval '7 days'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

-- Media export dataset
-- Note: p_filters is accepted for forward compatibility (not used in MVP).
CREATE OR REPLACE FUNCTION public.get_media_for_export(p_filters JSONB DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  public_url TEXT,
  folder_name TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.id,
    ml.file_name,
    ml.file_type,
    ml.file_size::bigint,
    ml.mime_type,
    ml.storage_path,
    ml.public_url,
    mf.name as folder_name,
    ARRAY(
      SELECT mt.name 
      FROM public.media_tag_assignments mta
      JOIN public.media_tags mt ON mta.tag_id = mt.id
      WHERE mta.media_id = ml.id
      ORDER BY mt.name
    ) as tags,
    (ml.created_at)::timestamptz,
    (ml.updated_at)::timestamptz
  FROM public.media_library ml
  LEFT JOIN public.media_folders mf ON ml.folder_id = mf.id
  WHERE ml.user_id = auth.uid()
  ORDER BY ml.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_exports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- MVP: remove only DB rows; file cleanup can be added later.
  DELETE FROM public.export_jobs
  WHERE expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

-- Storage bucket for exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (owner can read/list their own folder)
DO $$ BEGIN
  CREATE POLICY "Export files: user can read own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Export files: user can upload own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Export files: user can update own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Export files: user can delete own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional: pg_cron schedule (runs only if pg_cron is installed)
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pg_cron';
  IF FOUND THEN
    PERFORM cron.schedule(
      'cleanup-exports',
      '0 3 * * *',
      'SELECT public.cleanup_expired_exports();'
    );
  END IF;
END;
$$;