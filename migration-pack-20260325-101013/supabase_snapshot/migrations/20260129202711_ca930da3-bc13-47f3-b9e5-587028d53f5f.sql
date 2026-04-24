-- Recreate views with security_invoker=true to satisfy linter ----------------
DROP VIEW IF EXISTS public.user_funnel_metrics;
CREATE VIEW public.user_funnel_metrics
WITH (security_invoker = true)
AS
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
CREATE VIEW public.automation_metrics
WITH (security_invoker = true)
AS
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