-- Fix linter: remover view e substituir por RPC segura

DROP VIEW IF EXISTS public.user_onboarding_status;

-- Função (RPC) para retornar status do onboarding do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_onboarding_status()
RETURNS TABLE (
  user_id uuid,
  whatsapp_connected boolean,
  contacts_imported boolean,
  automation_created boolean,
  automation_activated boolean,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;
