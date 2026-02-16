-- Extend contacts table to support advanced search/filters -------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_search ON public.contacts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_contacts_tags_gin ON public.contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_user_created ON public.contacts(user_id, created_at DESC);

-- Trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION public.contacts_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.email, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_search_vector_trigger ON public.contacts;
CREATE TRIGGER contacts_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.contacts_search_vector_update();

-- Note: existing rows will get search_vector filled automatically on next update.


-- Advanced search RPC (full-text + filters + paging) -------------------------
CREATE OR REPLACE FUNCTION public.search_contacts(
  p_query TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_created_after TIMESTAMPTZ DEFAULT NULL,
  p_created_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  tags TEXT[],
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  custom_fields JSONB,
  relevance REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.phone,
    c.email,
    c.tags,
    c.status,
    c.created_at,
    c.updated_at,
    c.custom_fields,
    CASE
      WHEN p_query IS NOT NULL AND p_query <> '' THEN
        ts_rank(c.search_vector, plainto_tsquery('portuguese', p_query))
      ELSE 0
    END::real AS relevance
  FROM public.contacts c
  WHERE c.user_id = auth.uid()
    AND (
      p_query IS NULL OR p_query = '' OR
      (c.search_vector IS NOT NULL AND c.search_vector @@ plainto_tsquery('portuguese', p_query))
    )
    AND (p_tags IS NULL OR c.tags && p_tags)
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_created_after IS NULL OR c.created_at >= p_created_after)
    AND (p_created_before IS NULL OR c.created_at <= p_created_before)
  ORDER BY
    CASE WHEN p_query IS NOT NULL AND p_query <> '' THEN ts_rank(c.search_vector, plainto_tsquery('portuguese', p_query)) ELSE 0 END DESC,
    c.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200)
  OFFSET GREATEST(p_offset, 0);
END;
$$;


-- Bulk operations RPCs (avoid client-side SQL/raw) ---------------------------
CREATE OR REPLACE FUNCTION public.contacts_add_tags(
  p_contact_ids UUID[],
  p_tags TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.contacts c
  SET tags = (
    SELECT ARRAY(
      SELECT DISTINCT t
      FROM unnest(array_cat(COALESCE(c.tags, '{}'::text[]), COALESCE(p_tags, '{}'::text[]))) AS t
      WHERE t IS NOT NULL AND length(trim(t)) > 0
    )
  )
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.contacts_remove_tags(
  p_contact_ids UUID[],
  p_tags TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.contacts c
  SET tags = (
    SELECT ARRAY(
      SELECT t
      FROM unnest(COALESCE(c.tags, '{}'::text[])) AS t
      WHERE NOT (t = ANY(COALESCE(p_tags, '{}'::text[])))
    )
  )
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.contacts_change_status(
  p_contact_ids UUID[],
  p_status TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.contacts c
  SET status = COALESCE(p_status, c.status)
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.contacts_delete(
  p_contact_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.contacts c
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;