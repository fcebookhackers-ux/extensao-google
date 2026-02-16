-- Storage bucket for data exports (do NOT store files in DB)
-- Private bucket; users access via signed URLs generated server-side.

INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for exports bucket
-- Allow users to read/list only their own files: path prefix = user_id/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'exports_read_own'
  ) THEN
    CREATE POLICY exports_read_own
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'exports'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'exports_list_own'
  ) THEN
    -- Some clients use SELECT for listing; kept separate for clarity.
    CREATE POLICY exports_list_own
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'exports'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
