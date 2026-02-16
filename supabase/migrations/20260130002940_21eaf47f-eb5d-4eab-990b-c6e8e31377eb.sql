-- Media folders + tags for organizing media library

-- NOTE: We intentionally do NOT reference auth.users directly for user_id.
-- User ownership is enforced via RLS (auth.uid()) and application inserts.

-- ============================================
-- FOLDERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_folders_valid_name CHECK (length(name) >= 1 AND length(name) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_media_folders_user ON public.media_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON public.media_folders(parent_id);

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='media_folders'
      AND policyname='Users can manage own folders'
  ) THEN
    CREATE POLICY "Users can manage own folders"
      ON public.media_folders
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add folder_id to media_library (NULL means "no folder")
ALTER TABLE public.media_library
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.media_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_library_folder_id ON public.media_library(folder_id);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_tags_valid_name CHECK (length(name) >= 1 AND length(name) <= 50),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_media_tags_user ON public.media_tags(user_id);

ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='media_tags'
      AND policyname='Users can manage own tags'
  ) THEN
    CREATE POLICY "Users can manage own tags"
      ON public.media_tags
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Many-to-many assignments
CREATE TABLE IF NOT EXISTS public.media_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media_library(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.media_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(media_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_media_tag_assignments_media ON public.media_tag_assignments(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tag_assignments_tag ON public.media_tag_assignments(tag_id);

ALTER TABLE public.media_tag_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='media_tag_assignments'
      AND policyname='Users can manage tags of own media'
  ) THEN
    CREATE POLICY "Users can manage tags of own media"
      ON public.media_tag_assignments
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.media_library ml
          WHERE ml.id = public.media_tag_assignments.media_id
            AND ml.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.media_library ml
          WHERE ml.id = public.media_tag_assignments.media_id
            AND ml.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- Helpers
-- ============================================
CREATE OR REPLACE FUNCTION public.move_media_to_folder(
  p_media_ids UUID[],
  p_folder_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.media_library
  SET folder_id = p_folder_id,
      updated_at = NOW()
  WHERE id = ANY(p_media_ids)
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.add_tag_to_media(
  p_media_id UUID,
  p_tag_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure user owns the media, and tag belongs to the user
  IF NOT EXISTS (
    SELECT 1
    FROM public.media_library ml
    JOIN public.media_tags t ON t.id = p_tag_id
    WHERE ml.id = p_media_id
      AND ml.user_id = auth.uid()
      AND t.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para vincular tag';
  END IF;

  INSERT INTO public.media_tag_assignments (media_id, tag_id)
  VALUES (p_media_id, p_tag_id)
  ON CONFLICT (media_id, tag_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_tag_from_media(
  p_media_id UUID,
  p_tag_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure user owns the media
  IF NOT EXISTS (
    SELECT 1
    FROM public.media_library ml
    WHERE ml.id = p_media_id
      AND ml.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para remover tag';
  END IF;

  DELETE FROM public.media_tag_assignments
  WHERE media_id = p_media_id
    AND tag_id = p_tag_id;
END;
$$;

-- Maintain updated_at
CREATE TRIGGER update_media_folders_updated_at
BEFORE UPDATE ON public.media_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_tags_updated_at
BEFORE UPDATE ON public.media_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
