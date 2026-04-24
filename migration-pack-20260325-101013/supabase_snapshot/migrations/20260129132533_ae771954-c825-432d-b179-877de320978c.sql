-- 1) Extend automation_versions to support robust versioning
ALTER TABLE public.automation_versions
  ADD COLUMN IF NOT EXISTS version_number INT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  -- IMPORTANT: avoid FK to auth.users (Supabase-managed). Keep as UUID for reference.
  ADD COLUMN IF NOT EXISTS published_by UUID,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rollback_from UUID,
  ADD COLUMN IF NOT EXISTS change_summary TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- rollback_from references automation_versions.id (self-reference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'automation_versions_rollback_from_fkey'
  ) THEN
    ALTER TABLE public.automation_versions
      ADD CONSTRAINT automation_versions_rollback_from_fkey
      FOREIGN KEY (rollback_from)
      REFERENCES public.automation_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Backfill version_number for existing rows (if any) so it can be NOT NULL
-- If there are existing rows, we assign per automation_id ordered by created_at.
WITH ranked AS (
  SELECT id,
         automation_id,
         ROW_NUMBER() OVER (PARTITION BY automation_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.automation_versions
  WHERE version_number IS NULL
)
UPDATE public.automation_versions av
SET version_number = ranked.rn
FROM ranked
WHERE av.id = ranked.id;

-- Ensure version_number is NOT NULL (after backfill)
ALTER TABLE public.automation_versions
  ALTER COLUMN version_number SET NOT NULL;

-- 3) Performance indexes
CREATE INDEX IF NOT EXISTS idx_versions_automation_created
  ON public.automation_versions(automation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_versions_published
  ON public.automation_versions(automation_id, published_at DESC)
  WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_versions_current
  ON public.automation_versions(automation_id, is_current)
  WHERE is_current = TRUE;

-- Ensure only one current version per automation
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_version_per_automation
  ON public.automation_versions(automation_id)
  WHERE is_current = TRUE;

-- 4) RLS (defensive): keep users scoped to their own automations
ALTER TABLE public.automation_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_versions'
      AND policyname = 'automation_versions_select_own'
  ) THEN
    CREATE POLICY automation_versions_select_own
    ON public.automation_versions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.automations a
        WHERE a.id = automation_versions.automation_id
          AND a.user_id = auth.uid()
      )
    );
  END IF;

  -- INSERT (only via owner)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_versions'
      AND policyname = 'automation_versions_insert_own'
  ) THEN
    CREATE POLICY automation_versions_insert_own
    ON public.automation_versions
    FOR INSERT
    WITH CHECK (
      automation_versions.user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.automations a
        WHERE a.id = automation_versions.automation_id
          AND a.user_id = auth.uid()
      )
    );
  END IF;

  -- UPDATE (restricted; allow owner to update their own versions)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_versions'
      AND policyname = 'automation_versions_update_own'
  ) THEN
    CREATE POLICY automation_versions_update_own
    ON public.automation_versions
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.automations a
        WHERE a.id = automation_versions.automation_id
          AND a.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.automations a
        WHERE a.id = automation_versions.automation_id
          AND a.user_id = auth.uid()
      )
    );
  END IF;

  -- DELETE (restricted; allow owner)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_versions'
      AND policyname = 'automation_versions_delete_own'
  ) THEN
    CREATE POLICY automation_versions_delete_own
    ON public.automation_versions
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.automations a
        WHERE a.id = automation_versions.automation_id
          AND a.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 5) Functions (RPC) for version management
CREATE OR REPLACE FUNCTION public.create_automation_version(
  p_automation_id UUID,
  p_doc JSONB,
  p_change_summary TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_version_number INT;
  v_version_id UUID;
BEGIN
  -- Only owner can create versions for their automations
  IF NOT EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = p_automation_id
      AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso à automação';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
  FROM public.automation_versions
  WHERE automation_id = p_automation_id;

  INSERT INTO public.automation_versions (
    automation_id,
    version_number,
    doc,
    change_summary,
    user_id
  ) VALUES (
    p_automation_id,
    v_version_number,
    p_doc,
    p_change_summary,
    auth.uid()
  ) RETURNING id INTO v_version_id;

  -- Audit (if available)
  PERFORM public.log_audit_event(
    'automation.version_created',
    'automation',
    p_automation_id,
    jsonb_build_object(
      'version_id', v_version_id,
      'version_number', v_version_number,
      'change_summary', p_change_summary
    )
  );

  RETURN v_version_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_automation_version(
  p_automation_id UUID,
  p_version_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_version_id UUID;
  v_doc JSONB;
BEGIN
  IF NOT public.check_permission('automations.publish'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para publicar automações';
  END IF;

  -- Ensure caller owns the automation
  IF NOT EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = p_automation_id
      AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso à automação';
  END IF;

  -- Ensure version belongs to automation and fetch doc
  SELECT av.doc
    INTO v_doc
  FROM public.automation_versions av
  WHERE av.id = p_version_id
    AND av.automation_id = p_automation_id;

  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Versão não encontrada para esta automação';
  END IF;

  SELECT id INTO v_old_version_id
  FROM public.automation_versions
  WHERE automation_id = p_automation_id
    AND is_current = TRUE
  LIMIT 1;

  IF v_old_version_id IS NOT NULL THEN
    UPDATE public.automation_versions
    SET is_current = FALSE
    WHERE id = v_old_version_id;
  END IF;

  UPDATE public.automation_versions
  SET
    is_current = TRUE,
    published_at = NOW(),
    published_by = auth.uid()
  WHERE id = p_version_id;

  -- Update main automation doc + status
  UPDATE public.automations
  SET
    doc = v_doc,
    updated_at = NOW(),
    status = 'active'
  WHERE id = p_automation_id
    AND user_id = auth.uid();

  PERFORM public.log_audit_event(
    'automation.version_published',
    'automation',
    p_automation_id,
    jsonb_build_object(
      'new_version_id', p_version_id,
      'old_version_id', v_old_version_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_automation_version(
  p_automation_id UUID,
  p_target_version_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_version_id UUID;
  v_target_doc JSONB;
  v_target_version_number INT;
BEGIN
  IF NOT public.check_permission('automations.edit'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para editar automações';
  END IF;

  -- Ensure caller owns the automation
  IF NOT EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = p_automation_id
      AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso à automação';
  END IF;

  SELECT doc, version_number
    INTO v_target_doc, v_target_version_number
  FROM public.automation_versions
  WHERE id = p_target_version_id
    AND automation_id = p_automation_id;

  IF v_target_doc IS NULL THEN
    RAISE EXCEPTION 'Versão alvo não encontrada';
  END IF;

  v_new_version_id := public.create_automation_version(
    p_automation_id,
    v_target_doc,
    'Rollback para versão ' || v_target_version_number
  );

  UPDATE public.automation_versions
  SET rollback_from = p_target_version_id
  WHERE id = v_new_version_id;

  PERFORM public.log_audit_event(
    'automation.version_rollback',
    'automation',
    p_automation_id,
    jsonb_build_object(
      'new_version_id', v_new_version_id,
      'rollback_from_version_id', p_target_version_id,
      'rollback_from_version_number', v_target_version_number
    )
  );

  RETURN v_new_version_id;
END;
$$;

-- 6) Auto-version trigger on automations doc changes
CREATE OR REPLACE FUNCTION public.auto_create_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.doc IS DISTINCT FROM NEW.doc THEN
    PERFORM public.create_automation_version(
      NEW.id,
      NEW.doc,
      'Auto-save'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_auto_version_trigger ON public.automations;

CREATE TRIGGER automation_auto_version_trigger
AFTER UPDATE ON public.automations
FOR EACH ROW
WHEN (OLD.doc IS DISTINCT FROM NEW.doc)
EXECUTE FUNCTION public.auto_create_version();
