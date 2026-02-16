-- Enums
DO $$ BEGIN
  CREATE TYPE public.automation_status AS ENUM ('draft','active','paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.flow_var_type AS ENUM ('text','number','date','boolean');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Main automations table
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.automation_status NOT NULL DEFAULT 'draft',
  trigger JSONB NOT NULL DEFAULT '{}'::jsonb,
  global_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags_library TEXT[] NOT NULL DEFAULT '{}'::text[],
  doc JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations(user_id);

DROP TRIGGER IF EXISTS update_automations_updated_at ON public.automations;
CREATE TRIGGER update_automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Version history (snapshots)
CREATE TABLE IF NOT EXISTS public.automation_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  label TEXT,
  doc JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_versions_automation_id ON public.automation_versions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_versions_user_id ON public.automation_versions(user_id);

-- Flow variables (optional strongly typed catalog)
CREATE TABLE IF NOT EXISTS public.automation_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  var_type public.flow_var_type NOT NULL,
  default_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (automation_id, name)
);

CREATE INDEX IF NOT EXISTS idx_automation_variables_automation_id ON public.automation_variables(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_variables_user_id ON public.automation_variables(user_id);

DROP TRIGGER IF EXISTS update_automation_variables_updated_at ON public.automation_variables;
CREATE TRIGGER update_automation_variables_updated_at
BEFORE UPDATE ON public.automation_variables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_variables ENABLE ROW LEVEL SECURITY;

-- Policies: user owns their rows
DROP POLICY IF EXISTS "Users can view their automations" ON public.automations;
CREATE POLICY "Users can view their automations"
ON public.automations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their automations" ON public.automations;
CREATE POLICY "Users can create their automations"
ON public.automations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their automations" ON public.automations;
CREATE POLICY "Users can update their automations"
ON public.automations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their automations" ON public.automations;
CREATE POLICY "Users can delete their automations"
ON public.automations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Versions policies
DROP POLICY IF EXISTS "Users can view their automation versions" ON public.automation_versions;
CREATE POLICY "Users can view their automation versions"
ON public.automation_versions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their automation versions" ON public.automation_versions;
CREATE POLICY "Users can create their automation versions"
ON public.automation_versions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their automation versions" ON public.automation_versions;
CREATE POLICY "Users can delete their automation versions"
ON public.automation_versions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Variables policies
DROP POLICY IF EXISTS "Users can view their automation variables" ON public.automation_variables;
CREATE POLICY "Users can view their automation variables"
ON public.automation_variables
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their automation variables" ON public.automation_variables;
CREATE POLICY "Users can create their automation variables"
ON public.automation_variables
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their automation variables" ON public.automation_variables;
CREATE POLICY "Users can update their automation variables"
ON public.automation_variables
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their automation variables" ON public.automation_variables;
CREATE POLICY "Users can delete their automation variables"
ON public.automation_variables
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
