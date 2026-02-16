-- Fix: remove unsupported relation option `security_invoker`

-- 1) Materialized view (aggregated by user)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.media_analytics_summary AS
SELECT
  ml.user_id,
  COUNT(*)::bigint as total_files,
  COALESCE(SUM(ml.file_size), 0)::bigint as total_size_bytes,

  COALESCE(SUM(CASE WHEN COALESCE((ml.metadata->>'compressed')::boolean, false) THEN 1 ELSE 0 END), 0)::bigint as compressed_files,
  COALESCE(
    SUM(
      CASE
        WHEN COALESCE((ml.metadata->>'compressed')::boolean, false)
          THEN GREATEST(
            COALESCE(NULLIF(ml.metadata->>'original_size_bytes','')::bigint, 0) - COALESCE(NULLIF(ml.metadata->>'compressed_size_bytes','')::bigint, 0),
            0
          )
        ELSE 0
      END
    ),
    0
  )::bigint as total_savings_bytes,

  COUNT(*) FILTER (WHERE ml.file_type = 'image')::bigint as image_count,
  COALESCE(SUM(ml.file_size) FILTER (WHERE ml.file_type = 'image'), 0)::bigint as image_size_bytes,
  COUNT(*) FILTER (WHERE ml.file_type = 'video')::bigint as video_count,
  COALESCE(SUM(ml.file_size) FILTER (WHERE ml.file_type = 'video'), 0)::bigint as video_size_bytes,
  COUNT(*) FILTER (WHERE ml.file_type = 'document')::bigint as document_count,
  COALESCE(SUM(ml.file_size) FILTER (WHERE ml.file_type = 'document'), 0)::bigint as document_size_bytes,
  COUNT(*) FILTER (WHERE ml.file_type = 'audio')::bigint as audio_count,
  COALESCE(SUM(ml.file_size) FILTER (WHERE ml.file_type = 'audio'), 0)::bigint as audio_size_bytes,

  MIN(ml.created_at) as first_upload_at,
  MAX(ml.created_at) as last_upload_at,
  MAX(ml.updated_at) as last_updated_at
FROM public.media_library ml
GROUP BY ml.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_analytics_user
  ON public.media_analytics_summary(user_id);

-- 2) Helper views (scoped to auth.uid())
CREATE OR REPLACE VIEW public.media_uploads_by_day AS
SELECT
  ml.user_id,
  (date_trunc('day', ml.created_at))::date as upload_date,
  COUNT(*)::bigint as file_count,
  COALESCE(SUM(ml.file_size), 0)::bigint as total_size_bytes,
  COUNT(*) FILTER (WHERE ml.file_type = 'image')::bigint as images,
  COUNT(*) FILTER (WHERE ml.file_type = 'video')::bigint as videos,
  COUNT(*) FILTER (WHERE ml.file_type = 'document')::bigint as documents,
  COUNT(*) FILTER (WHERE ml.file_type = 'audio')::bigint as audio
FROM public.media_library ml
WHERE ml.user_id = auth.uid()
  AND ml.created_at >= NOW() - INTERVAL '90 days'
GROUP BY ml.user_id, (date_trunc('day', ml.created_at))::date
ORDER BY upload_date DESC;

CREATE OR REPLACE VIEW public.media_largest_files AS
SELECT
  ml.id,
  ml.user_id,
  ml.file_name,
  ml.file_type,
  ml.file_size,
  ml.mime_type,
  ml.created_at,
  ml.folder_id
FROM public.media_library ml
WHERE ml.user_id = auth.uid()
ORDER BY ml.file_size DESC
LIMIT 100;

CREATE OR REPLACE VIEW public.media_top_tags AS
SELECT
  mt.user_id,
  mt.id as tag_id,
  mt.name as tag_name,
  mt.color,
  COUNT(mta.media_id)::bigint as usage_count,
  COALESCE(SUM(ml.file_size), 0)::bigint as total_size_bytes
FROM public.media_tags mt
LEFT JOIN public.media_tag_assignments mta ON mt.id = mta.tag_id
LEFT JOIN public.media_library ml ON mta.media_id = ml.id
WHERE mt.user_id = auth.uid()
GROUP BY mt.user_id, mt.id, mt.name, mt.color
ORDER BY usage_count DESC, total_size_bytes DESC;

-- 3) Refresh function
CREATE OR REPLACE FUNCTION public.refresh_media_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.media_analytics_summary;
END;
$$;

-- 4) RPC
CREATE OR REPLACE FUNCTION public.get_media_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary RECORD;
  v_quota RECORD;
BEGIN
  SELECT * INTO v_summary
  FROM public.media_analytics_summary
  WHERE user_id = auth.uid();

  SELECT * INTO v_quota
  FROM public.user_storage_quotas
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'total_files', COALESCE(v_summary.total_files, 0),
    'total_size_bytes', COALESCE(v_summary.total_size_bytes, 0),
    'compressed_files', COALESCE(v_summary.compressed_files, 0),
    'total_savings_bytes', COALESCE(v_summary.total_savings_bytes, 0),
    'quota', jsonb_build_object(
      'used_bytes', COALESCE(v_quota.total_size_bytes, 0),
      'max_bytes', COALESCE(v_quota.max_size_bytes, 5368709120),
      'used_percentage', CASE
        WHEN COALESCE(v_quota.max_size_bytes, 5368709120) > 0
          THEN ROUND((COALESCE(v_quota.total_size_bytes, 0)::numeric / COALESCE(v_quota.max_size_bytes, 5368709120)) * 100, 2)
        ELSE 0
      END,
      'file_count', COALESCE(v_quota.file_count, 0),
      'max_file_count', COALESCE(v_quota.max_file_count, 1000)
    ),
    'by_type', jsonb_build_object(
      'image', jsonb_build_object(
        'count', COALESCE(v_summary.image_count, 0),
        'size_bytes', COALESCE(v_summary.image_size_bytes, 0)
      ),
      'video', jsonb_build_object(
        'count', COALESCE(v_summary.video_count, 0),
        'size_bytes', COALESCE(v_summary.video_size_bytes, 0)
      ),
      'document', jsonb_build_object(
        'count', COALESCE(v_summary.document_count, 0),
        'size_bytes', COALESCE(v_summary.document_size_bytes, 0)
      ),
      'audio', jsonb_build_object(
        'count', COALESCE(v_summary.audio_count, 0),
        'size_bytes', COALESCE(v_summary.audio_size_bytes, 0)
      )
    ),
    'first_upload_at', v_summary.first_upload_at,
    'last_upload_at', v_summary.last_upload_at
  );
END;
$$;
