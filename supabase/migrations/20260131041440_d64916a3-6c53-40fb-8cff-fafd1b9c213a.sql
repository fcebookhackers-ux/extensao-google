-- Marketplace de Templates de Automações
-- Regras:
-- - NÃO referenciar auth.users (tabela reservada)
-- - RLS: templates públicos são legíveis por todos logados; privados apenas pelo dono
-- - Rating permitido apenas para quem instalou/usou (via template_installs)

-- Helper: updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) Templates
CREATE TABLE IF NOT EXISTS public.automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_public BOOLEAN NOT NULL DEFAULT false,
  configuration JSONB NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_templates_public ON public.automation_templates (is_public);
CREATE INDEX IF NOT EXISTS idx_automation_templates_category ON public.automation_templates (category);
CREATE INDEX IF NOT EXISTS idx_automation_templates_use_count ON public.automation_templates (use_count DESC);
CREATE INDEX IF NOT EXISTS idx_automation_templates_rating_avg ON public.automation_templates (rating_avg DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_automation_templates_created_at ON public.automation_templates (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_templates_tags_gin ON public.automation_templates USING GIN (tags);

ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: públicos ou do próprio usuário
DROP POLICY IF EXISTS automation_templates_select_public_or_own ON public.automation_templates;
CREATE POLICY automation_templates_select_public_or_own
ON public.automation_templates
FOR SELECT
USING (is_public = true OR created_by = auth.uid());

-- INSERT/UPDATE/DELETE: apenas dono
DROP POLICY IF EXISTS automation_templates_insert_own ON public.automation_templates;
CREATE POLICY automation_templates_insert_own
ON public.automation_templates
FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS automation_templates_update_own ON public.automation_templates;
CREATE POLICY automation_templates_update_own
ON public.automation_templates
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS automation_templates_delete_own ON public.automation_templates;
CREATE POLICY automation_templates_delete_own
ON public.automation_templates
FOR DELETE
USING (created_by = auth.uid());

DROP TRIGGER IF EXISTS trg_automation_templates_updated_at ON public.automation_templates;
CREATE TRIGGER trg_automation_templates_updated_at
BEFORE UPDATE ON public.automation_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Instalações (para validar quem pode avaliar)
CREATE TABLE IF NOT EXISTS public.template_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.automation_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  automation_id UUID,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_template_installs_template_user ON public.template_installs (template_id, user_id);
CREATE INDEX IF NOT EXISTS idx_template_installs_user ON public.template_installs (user_id);
CREATE INDEX IF NOT EXISTS idx_template_installs_template ON public.template_installs (template_id);

ALTER TABLE public.template_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS template_installs_select_own ON public.template_installs;
CREATE POLICY template_installs_select_own
ON public.template_installs
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS template_installs_insert_own ON public.template_installs;
CREATE POLICY template_installs_insert_own
ON public.template_installs
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS template_installs_update_own ON public.template_installs;
CREATE POLICY template_installs_update_own
ON public.template_installs
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS template_installs_delete_own ON public.template_installs;
CREATE POLICY template_installs_delete_own
ON public.template_installs
FOR DELETE
USING (user_id = auth.uid());

-- 3) Avaliações
CREATE TABLE IF NOT EXISTS public.template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.automation_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_ratings_template ON public.template_ratings (template_id);
CREATE INDEX IF NOT EXISTS idx_template_ratings_user ON public.template_ratings (user_id);

ALTER TABLE public.template_ratings ENABLE ROW LEVEL SECURITY;

-- SELECT: ver reviews apenas de templates públicos (ou do próprio autor do template)
DROP POLICY IF EXISTS template_ratings_select_public_templates ON public.template_ratings;
CREATE POLICY template_ratings_select_public_templates
ON public.template_ratings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.automation_templates t
    WHERE t.id = template_ratings.template_id
      AND (t.is_public = true OR t.created_by = auth.uid())
  )
);

-- INSERT/UPDATE/DELETE: somente o próprio usuário
DROP POLICY IF EXISTS template_ratings_insert_own ON public.template_ratings;
CREATE POLICY template_ratings_insert_own
ON public.template_ratings
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS template_ratings_update_own ON public.template_ratings;
CREATE POLICY template_ratings_update_own
ON public.template_ratings
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS template_ratings_delete_own ON public.template_ratings;
CREATE POLICY template_ratings_delete_own
ON public.template_ratings
FOR DELETE
USING (user_id = auth.uid());

-- Trigger: só pode avaliar se instalou
CREATE OR REPLACE FUNCTION public.enforce_rating_requires_install()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.template_installs i
    WHERE i.template_id = NEW.template_id
      AND i.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'rating_not_allowed: user must install template before rating';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_template_ratings_requires_install ON public.template_ratings;
CREATE TRIGGER trg_template_ratings_requires_install
BEFORE INSERT OR UPDATE ON public.template_ratings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_rating_requires_install();

-- Trigger: manter rating_avg em automation_templates
CREATE OR REPLACE FUNCTION public.recompute_template_rating_avg()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id uuid;
BEGIN
  v_template_id := COALESCE(NEW.template_id, OLD.template_id);

  UPDATE public.automation_templates t
  SET rating_avg = sub.avg_rating
  FROM (
    SELECT template_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM public.template_ratings
    WHERE template_id = v_template_id
    GROUP BY template_id
  ) sub
  WHERE t.id = v_template_id;

  -- Se não houver mais ratings, zera rating_avg
  UPDATE public.automation_templates
  SET rating_avg = NULL
  WHERE id = v_template_id
    AND NOT EXISTS (SELECT 1 FROM public.template_ratings r WHERE r.template_id = v_template_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_template_ratings_recompute_avg ON public.template_ratings;
CREATE TRIGGER trg_template_ratings_recompute_avg
AFTER INSERT OR UPDATE OR DELETE ON public.template_ratings
FOR EACH ROW
EXECUTE FUNCTION public.recompute_template_rating_avg();

-- Trigger: incrementar use_count ao instalar (idempotente por user/template via unique)
CREATE OR REPLACE FUNCTION public.increment_template_use_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.automation_templates
  SET use_count = use_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_template_installs_inc_use_count ON public.template_installs;
CREATE TRIGGER trg_template_installs_inc_use_count
AFTER INSERT ON public.template_installs
FOR EACH ROW
EXECUTE FUNCTION public.increment_template_use_count();

-- 4) Seed: templates padrão (públicos)
INSERT INTO public.automation_templates (created_by, name, description, category, tags, is_public, configuration)
SELECT
  auth.uid(),
  seed.name,
  seed.description,
  seed.category,
  seed.tags,
  true,
  seed.configuration
FROM (
  VALUES
    (
      'Auto-responder de Boas-vindas',
      'Responde automaticamente quando um novo contato envia primeira mensagem',
      'customer_support',
      ARRAY['onboarding','first_contact']::text[],
      jsonb_build_object(
        'trigger', jsonb_build_object('type','message_received','filters', jsonb_build_object('is_first_message', true)),
        'steps', jsonb_build_array(
          jsonb_build_object('type','send_message','template','Olá! Bem-vindo à {{company_name}}'),
          jsonb_build_object('type','add_tag','tag','new_contact')
        )
      )
    ),
    (
      'Escalação por Palavra-chave',
      'Escala para o time quando detectar palavra-chave',
      'sales',
      ARRAY['lead_qualification','routing']::text[],
      jsonb_build_object(
        'trigger', jsonb_build_object('type','message_received'),
        'steps', jsonb_build_array(
          jsonb_build_object(
            'type','condition',
            'conditions', jsonb_build_array(
              jsonb_build_object('field','message.body','operator','contains','value','urgente')
            ),
            'if_true', jsonb_build_array(
              jsonb_build_object('type','notify_team','channel','slack','message','Lead urgente!')
            )
          )
        )
      )
    )
) AS seed(name, description, category, tags, configuration)
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
