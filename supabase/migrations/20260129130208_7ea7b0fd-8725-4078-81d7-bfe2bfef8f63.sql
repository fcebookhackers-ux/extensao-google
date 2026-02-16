-- Onboarding: rastreamento de progresso (seguro, sem FK em auth.users)

-- 1) Tabela para rastrear progresso
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_completed ON public.onboarding_progress(user_id, completed_at);

-- 2) RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Users can view own onboarding progress"
ON public.onboarding_progress
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Users can insert own onboarding progress"
ON public.onboarding_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3) Função para marcar step como completo (idempotente)
CREATE OR REPLACE FUNCTION public.complete_onboarding_step(
  p_step_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  progress_id UUID;
BEGIN
  INSERT INTO public.onboarding_progress (user_id, step_id, metadata)
  VALUES (auth.uid(), p_step_id, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (user_id, step_id) DO NOTHING
  RETURNING id INTO progress_id;

  RETURN progress_id;
END;
$$;

-- 4) View de status do onboarding (por usuário atual; evita ler auth.users)
CREATE OR REPLACE VIEW public.user_onboarding_status AS
SELECT
  auth.uid() AS user_id,
  EXISTS(
    SELECT 1 FROM public.onboarding_progress op
    WHERE op.user_id = auth.uid() AND op.step_id = 'whatsapp_connected'
  ) AS whatsapp_connected,
  EXISTS(
    SELECT 1 FROM public.onboarding_progress op
    WHERE op.user_id = auth.uid() AND op.step_id = 'contacts_imported'
  ) AS contacts_imported,
  EXISTS(
    SELECT 1 FROM public.onboarding_progress op
    WHERE op.user_id = auth.uid() AND op.step_id = 'automation_created'
  ) AS automation_created,
  EXISTS(
    SELECT 1 FROM public.onboarding_progress op
    WHERE op.user_id = auth.uid() AND op.step_id = 'automation_activated'
  ) AS automation_activated,
  (
    SELECT completed_at FROM public.onboarding_progress op
    WHERE op.user_id = auth.uid() AND op.step_id = 'onboarding_completed'
    ORDER BY completed_at DESC
    LIMIT 1
  ) AS completed_at;
