-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes for media_library search
CREATE INDEX IF NOT EXISTS idx_media_search_name_trgm
  ON public.media_library USING gin (file_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_media_search_type
  ON public.media_library (file_type);
CREATE INDEX IF NOT EXISTS idx_media_search_mime
  ON public.media_library (mime_type);
CREATE INDEX IF NOT EXISTS idx_media_search_created
  ON public.media_library (created_at DESC);

-- Indexes for webhooks search
CREATE INDEX IF NOT EXISTS idx_webhook_search_name_trgm
  ON public.webhooks USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_webhook_search_url_trgm
  ON public.webhooks USING gin (url gin_trgm_ops);

-- Saved searches table (NOTE: no FK to auth.users; user_id is enforced by RLS)
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  search_type TEXT NOT NULL, -- 'media', 'webhooks', 'logs', 'global'
  filters JSONB NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_type
  ON public.saved_searches(search_type);
CREATE INDEX IF NOT EXISTS idx_saved_searches_favorite
  ON public.saved_searches(user_id, is_favorite)
  WHERE is_favorite = true;

-- RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_searches'
      AND policyname = 'Users can manage own saved searches'
  ) THEN
    CREATE POLICY "Users can manage own saved searches"
      ON public.saved_searches
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at helper (safe to OR REPLACE)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_saved_searches_updated_at'
  ) THEN
    CREATE TRIGGER set_saved_searches_updated_at
    BEFORE UPDATE ON public.saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Advanced media search function
CREATE OR REPLACE FUNCTION public.search_media(
  p_query TEXT DEFAULT NULL,
  p_file_types TEXT[] DEFAULT NULL,
  p_mime_types TEXT[] DEFAULT NULL,
  p_folder_ids UUID[] DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT NULL,
  p_min_size BIGINT DEFAULT NULL,
  p_max_size BIGINT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  mime_type TEXT,
  folder_id UUID,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ,
  match_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ml.id,
    ml.file_name,
    ml.file_type,
    ml.file_size,
    ml.mime_type,
    ml.folder_id,
    ml.thumbnail_url,
    ml.created_at,
    CASE
      WHEN p_query IS NOT NULL THEN similarity(ml.file_name, p_query)
      ELSE 1.0
    END AS match_score
  FROM public.media_library ml
  WHERE ml.user_id = auth.uid()
    AND (
      p_query IS NULL
      OR ml.file_name ILIKE '%' || p_query || '%'
      OR ml.file_name % p_query
    )
    AND (p_file_types IS NULL OR ml.file_type = ANY(p_file_types))
    AND (p_mime_types IS NULL OR ml.mime_type = ANY(p_mime_types))
    AND (
      p_folder_ids IS NULL
      OR ml.folder_id = ANY(p_folder_ids)
      OR (NULL = ANY(p_folder_ids) AND ml.folder_id IS NULL)
    )
    AND (
      p_tag_ids IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.media_tag_assignments mta
        WHERE mta.media_id = ml.id
          AND mta.tag_id = ANY(p_tag_ids)
      )
    )
    AND (p_min_size IS NULL OR ml.file_size >= p_min_size)
    AND (p_max_size IS NULL OR ml.file_size <= p_max_size)
    AND (p_date_from IS NULL OR ml.created_at >= p_date_from)
    AND (p_date_to IS NULL OR ml.created_at <= p_date_to)
  ORDER BY match_score DESC, ml.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Advanced webhooks search function
CREATE OR REPLACE FUNCTION public.search_webhooks(
  p_query TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_events TEXT[] DEFAULT NULL,
  p_has_failures BOOLEAN DEFAULT NULL,
  p_circuit_state TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  url TEXT,
  is_active BOOLEAN,
  events TEXT[],
  created_at TIMESTAMPTZ,
  match_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.url,
    w.is_active,
    w.events,
    w.created_at,
    CASE
      WHEN p_query IS NOT NULL THEN
        GREATEST(similarity(w.name, p_query), similarity(w.url, p_query))
      ELSE 1.0
    END AS match_score
  FROM public.webhooks w
  LEFT JOIN public.webhook_circuit_breaker wcb ON w.id = wcb.webhook_id
  WHERE w.user_id = auth.uid()
    AND (
      p_query IS NULL
      OR w.name ILIKE '%' || p_query || '%'
      OR w.url ILIKE '%' || p_query || '%'
      OR w.name % p_query
      OR w.url % p_query
    )
    AND (p_is_active IS NULL OR w.is_active = p_is_active)
    AND (
      p_events IS NULL
      OR w.events && p_events
    )
    AND (
      p_has_failures IS NULL
      OR (
        p_has_failures = true AND EXISTS (
          SELECT 1
          FROM public.webhook_logs wl
          WHERE wl.webhook_id = w.id
            AND COALESCE(wl.executed_at, wl.created_at, now()) >= NOW() - INTERVAL '24 hours'
            AND (COALESCE(wl.response_status, 0) >= 400 OR wl.error_message IS NOT NULL)
        )
      )
      OR (
        p_has_failures = false AND NOT EXISTS (
          SELECT 1
          FROM public.webhook_logs wl
          WHERE wl.webhook_id = w.id
            AND COALESCE(wl.executed_at, wl.created_at, now()) >= NOW() - INTERVAL '24 hours'
            AND (COALESCE(wl.response_status, 0) >= 400 OR wl.error_message IS NOT NULL)
        )
      )
    )
    AND (p_circuit_state IS NULL OR wcb.state::TEXT = p_circuit_state)
  ORDER BY match_score DESC, w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Global search aggregator
CREATE OR REPLACE FUNCTION public.global_search(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_media JSONB;
  v_webhooks JSONB;
  v_folders JSONB;
  v_tags JSONB;
BEGIN
  -- Media
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'media',
      'title', file_name,
      'subtitle', file_type,
      'url', '/media/' || id,
      'score', match_score
    )
  ) INTO v_media
  FROM public.search_media(
    p_query => p_query,
    p_limit => GREATEST(1, p_limit / 4)
  );

  -- Webhooks
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'webhook',
      'title', name,
      'subtitle', url,
      'url', '/webhooks/' || id,
      'score', match_score
    )
  ) INTO v_webhooks
  FROM public.search_webhooks(
    p_query => p_query,
    p_limit => GREATEST(1, p_limit / 4)
  );

  -- Folders
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'folder',
      'title', name,
      'subtitle', 'Pasta de mídia',
      'url', '/media?folder=' || id,
      'score', similarity(name, p_query)
    )
  ) INTO v_folders
  FROM public.media_folders
  WHERE user_id = auth.uid()
    AND (name ILIKE '%' || p_query || '%' OR name % p_query)
  ORDER BY similarity(name, p_query) DESC
  LIMIT GREATEST(1, p_limit / 4);

  -- Tags
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'tag',
      'title', name,
      'subtitle', 'Tag de mídia',
      'url', '/media?tag=' || id,
      'score', similarity(name, p_query)
    )
  ) INTO v_tags
  FROM public.media_tags
  WHERE user_id = auth.uid()
    AND (name ILIKE '%' || p_query || '%' OR name % p_query)
  ORDER BY similarity(name, p_query) DESC
  LIMIT GREATEST(1, p_limit / 4);

  RETURN jsonb_build_object(
    'media', COALESCE(v_media, '[]'::jsonb),
    'webhooks', COALESCE(v_webhooks, '[]'::jsonb),
    'folders', COALESCE(v_folders, '[]'::jsonb),
    'tags', COALESCE(v_tags, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Saved search usage increment
CREATE OR REPLACE FUNCTION public.use_saved_search(p_search_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.saved_searches
  SET
    last_used_at = NOW(),
    use_count = use_count + 1,
    updated_at = NOW()
  WHERE id = p_search_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;