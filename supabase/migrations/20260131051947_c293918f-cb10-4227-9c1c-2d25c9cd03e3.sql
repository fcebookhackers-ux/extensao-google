-- Scheduled automations
CREATE TABLE IF NOT EXISTS public.scheduled_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  schedule_type TEXT NOT NULL, -- 'once', 'daily', 'weekly', 'monthly', 'cron'
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_automations_next_run
  ON public.scheduled_automations(next_run_at)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_automations_automation
  ON public.scheduled_automations(automation_id);

-- Ensure one active schedule per automation (optional but useful)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_scheduled_automations_active_per_automation
  ON public.scheduled_automations(automation_id)
  WHERE enabled = true;

ALTER TABLE public.scheduled_automations ENABLE ROW LEVEL SECURITY;

-- updated_at trigger helper (safe to replace)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_scheduled_automations_updated_at ON public.scheduled_automations;
CREATE TRIGGER update_scheduled_automations_updated_at
BEFORE UPDATE ON public.scheduled_automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies: user must own the automation and have automations.edit permission
CREATE POLICY "Users can select own scheduled automations"
ON public.scheduled_automations
FOR SELECT
USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can insert scheduled automations for own automations with permission"
ON public.scheduled_automations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND check_permission('automations.edit'::permission_type)
  AND EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = scheduled_automations.automation_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update scheduled automations for own automations with permission"
ON public.scheduled_automations
FOR UPDATE
USING (
  auth.uid() = user_id
  AND check_permission('automations.edit'::permission_type)
  AND EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = scheduled_automations.automation_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND check_permission('automations.edit'::permission_type)
  AND EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = scheduled_automations.automation_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scheduled automations for own automations with permission"
ON public.scheduled_automations
FOR DELETE
USING (
  auth.uid() = user_id
  AND check_permission('automations.edit'::permission_type)
  AND EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = scheduled_automations.automation_id
      AND a.user_id = auth.uid()
  )
);
