-- Profiles (app-level user data, no FK to auth.users) -----------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Contacts (minimal) ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own contacts"
  ON public.contacts
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own contacts"
  ON public.contacts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own contacts"
  ON public.contacts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own contacts"
  ON public.contacts
  FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Analytics events -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_type_created
  ON public.analytics_events(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_automation_created
  ON public.analytics_events(automation_id, created_at DESC)
  WHERE automation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_created
  ON public.analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_session
  ON public.analytics_events(session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own analytics events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all analytics"
  ON public.analytics_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Views (non-materialized) ---------------------------------------------------
DROP VIEW IF EXISTS public.user_funnel_metrics;
CREATE VIEW public.user_funnel_metrics AS
SELECT
  p.user_id,
  p.email,
  p.created_at AS signup_date,

  EXISTS(
    SELECT 1 FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'whatsapp.connected'
  ) AS whatsapp_connected,
  (
    SELECT MIN(e.created_at) FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'whatsapp.connected'
  ) AS whatsapp_connected_at,

  EXISTS(
    SELECT 1 FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'contacts.imported'
  ) AS contacts_imported,
  (
    SELECT MIN(e.created_at) FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'contacts.imported'
  ) AS contacts_imported_at,

  EXISTS(
    SELECT 1 FROM public.automations a
    WHERE a.user_id = p.user_id
  ) AS automation_created,
  (
    SELECT MIN(a.created_at) FROM public.automations a
    WHERE a.user_id = p.user_id
  ) AS automation_created_at,

  EXISTS(
    SELECT 1 FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'automation.activated'
  ) AS automation_activated,
  (
    SELECT MIN(e.created_at) FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'automation.activated'
  ) AS automation_activated_at,

  EXISTS(
    SELECT 1 FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'message.sent'
  ) AS first_message_sent,
  (
    SELECT MIN(e.created_at) FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'message.sent'
  ) AS first_message_sent_at,

  (
    SELECT COUNT(*) FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.event_type = 'message.sent'
  ) AS total_messages_sent,

  (
    SELECT COUNT(DISTINCT e.automation_id) FROM public.analytics_events e
    WHERE e.user_id = p.user_id AND e.automation_id IS NOT NULL
  ) AS active_automations_count
FROM public.profiles p;

DROP VIEW IF EXISTS public.automation_metrics;
CREATE VIEW public.automation_metrics AS
SELECT
  a.id AS automation_id,
  a.user_id,
  a.name,
  a.status,
  a.created_at,

  COALESCE((
    SELECT COUNT(*) FROM public.analytics_events e
    WHERE e.automation_id = a.id AND e.event_type = 'message.sent'
  ), 0) AS messages_sent,

  COALESCE((
    SELECT COUNT(*) FROM public.analytics_events e
    WHERE e.automation_id = a.id AND e.event_type = 'message.delivered'
  ), 0) AS messages_delivered,

  COALESCE((
    SELECT COUNT(*) FROM public.analytics_events e
    WHERE e.automation_id = a.id AND e.event_type = 'message.read'
  ), 0) AS messages_read,

  COALESCE((
    SELECT COUNT(*) FROM public.analytics_events e
    WHERE e.automation_id = a.id AND e.event_type = 'message.replied'
  ), 0) AS messages_replied,

  COALESCE((
    SELECT COUNT(*) FROM public.analytics_events e
    WHERE e.automation_id = a.id AND e.event_type = 'message.failed'
  ), 0) AS messages_failed,

  COALESCE((
    SELECT COUNT(DISTINCT e.contact_id) FROM public.analytics_events e
    WHERE e.automation_id = a.id AND e.contact_id IS NOT NULL
  ), 0) AS unique_contacts_reached,

  (
    SELECT MAX(e.created_at) FROM public.analytics_events e
    WHERE e.automation_id = a.id
  ) AS last_activity_at
FROM public.automations a;


-- Function ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_type TEXT,
  p_properties JSONB DEFAULT '{}'::jsonb,
  p_session_id TEXT DEFAULT NULL,
  p_automation_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_properties,
    session_id,
    automation_id,
    contact_id
  ) VALUES (
    auth.uid(),
    p_event_type,
    COALESCE(p_properties, '{}'::jsonb),
    p_session_id,
    p_automation_id,
    p_contact_id
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;