-- Configurable alert system (per-user)

-- 1) Alert configs
CREATE TABLE IF NOT EXISTS public.alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  alert_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_configs_user_id ON public.alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_enabled ON public.alert_configs(enabled);

-- 2) Alert history
CREATE TABLE IF NOT EXISTS public.alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id uuid NULL REFERENCES public.alert_configs(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_history_user_id_triggered_at ON public.alert_history(user_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_config_id_triggered_at ON public.alert_history(alert_config_id, triggered_at DESC);

-- 3) RLS
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- alert_configs policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alert_configs' AND policyname='Users can select own alert configs'
  ) THEN
    CREATE POLICY "Users can select own alert configs"
    ON public.alert_configs
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alert_configs' AND policyname='Users can insert own alert configs'
  ) THEN
    CREATE POLICY "Users can insert own alert configs"
    ON public.alert_configs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alert_configs' AND policyname='Users can update own alert configs'
  ) THEN
    CREATE POLICY "Users can update own alert configs"
    ON public.alert_configs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alert_configs' AND policyname='Users can delete own alert configs'
  ) THEN
    CREATE POLICY "Users can delete own alert configs"
    ON public.alert_configs
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;

  -- alert_history policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alert_history' AND policyname='Users can select own alert history'
  ) THEN
    CREATE POLICY "Users can select own alert history"
    ON public.alert_history
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alert_history' AND policyname='Users can insert own alert history'
  ) THEN
    CREATE POLICY "Users can insert own alert history"
    ON public.alert_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4) updated_at trigger (avoid relying on previously-created helpers)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_alert_configs_set_updated_at ON public.alert_configs;
CREATE TRIGGER trg_alert_configs_set_updated_at
BEFORE UPDATE ON public.alert_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
