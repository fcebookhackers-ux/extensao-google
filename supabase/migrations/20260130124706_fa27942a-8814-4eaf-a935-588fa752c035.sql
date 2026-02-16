-- Security hardening for media analytics
-- 1) Prevent direct API access to the materialized view
REVOKE ALL ON public.media_analytics_summary FROM anon, authenticated;

-- 2) Remove API-exposed views (replace with RPCs)
DROP VIEW IF EXISTS public.media_uploads_by_day;
DROP VIEW IF EXISTS public.media_largest_files;
DROP VIEW IF EXISTS public.media_top_tags;

-- 3) RPC: uploads by day (scoped to auth.uid)
CREATE OR REPLACE FUNCTION public.get_media_upload_trend(p_days integer DEFAULT 30)
RETURNS TABLE(
  upload_date date,
  file_count bigint,
  total_size_bytes bigint,
  images bigint,
  videos bigint,
  documents bigint,
  audio bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (date_trunc('day', ml.created_at))::date as upload_date,
    COUNT(*)::bigint as file_count,
    COALESCE(SUM(ml.file_size), 0)::bigint as total_size_bytes,
    COUNT(*) FILTER (WHERE ml.file_type = 'image')::bigint as images,
    COUNT(*) FILTER (WHERE ml.file_type = 'video')::bigint as videos,
    COUNT(*) FILTER (WHERE ml.file_type = 'document')::bigint as documents,
    COUNT(*) FILTER (WHERE ml.file_type = 'audio')::bigint as audio
  FROM public.media_library ml
  WHERE ml.user_id = auth.uid()
    AND ml.created_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
  GROUP BY (date_trunc('day', ml.created_at))::date
  ORDER BY upload_date ASC;
$$;

-- 4) RPC: largest files (scoped)
CREATE OR REPLACE FUNCTION public.get_media_largest_files(p_limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  file_name text,
  file_type text,
  file_size bigint,
  mime_type text,
  created_at timestamptz,
  folder_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ml.id,
    ml.file_name,
    ml.file_type,
    ml.file_size,
    ml.mime_type,
    ml.created_at,
    ml.folder_id
  FROM public.media_library ml
  WHERE ml.user_id = auth.uid()
  ORDER BY ml.file_size DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

-- 5) RPC: top tags (scoped)
CREATE OR REPLACE FUNCTION public.get_media_top_tags(p_limit integer DEFAULT 10)
RETURNS TABLE(
  tag_id uuid,
  tag_name text,
  color text,
  usage_count bigint,
  total_size_bytes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mt.id as tag_id,
    mt.name as tag_name,
    mt.color,
    COUNT(mta.media_id)::bigint as usage_count,
    COALESCE(SUM(ml.file_size), 0)::bigint as total_size_bytes
  FROM public.media_tags mt
  LEFT JOIN public.media_tag_assignments mta ON mt.id = mta.tag_id
  LEFT JOIN public.media_library ml ON mta.media_id = ml.id
  WHERE mt.user_id = auth.uid()
  GROUP BY mt.id, mt.name, mt.color
  ORDER BY usage_count DESC, total_size_bytes DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;
