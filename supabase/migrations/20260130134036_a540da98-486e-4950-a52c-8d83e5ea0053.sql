-- Notification system (in-app realtime)

-- Enums
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'webhook_failure',
    'webhook_circuit_open',
    'storage_quota_warning',
    'storage_quota_critical',
    'media_processing_complete',
    'media_processing_failed',
    'system_announcement',
    'security_alert'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  priority public.notification_priority NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON public.notifications(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own notifications
DO $$ BEGIN
  CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTE: We intentionally do NOT allow client-side INSERT into notifications.
-- Notifications are created via SECURITY DEFINER function + triggers.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  webhook_failure_enabled BOOLEAN NOT NULL DEFAULT true,
  webhook_circuit_open_enabled BOOLEAN NOT NULL DEFAULT true,
  storage_quota_warning_enabled BOOLEAN NOT NULL DEFAULT true,
  storage_quota_critical_enabled BOOLEAN NOT NULL DEFAULT true,
  media_processing_complete_enabled BOOLEAN NOT NULL DEFAULT true,
  media_processing_failed_enabled BOOLEAN NOT NULL DEFAULT true,
  system_announcement_enabled BOOLEAN NOT NULL DEFAULT true,
  security_alert_enabled BOOLEAN NOT NULL DEFAULT true,

  email_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  email_digest_frequency TEXT NOT NULL DEFAULT 'daily',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own preferences"
    ON public.notification_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create preferences row on user creation
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_user_created_notification_prefs
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_preferences();

-- Core notification creation (respects preferences, always allows critical/security)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_message TEXT,
  p_priority public.notification_priority DEFAULT 'medium',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_expires_in_hours INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_prefs public.notification_preferences%ROWTYPE;
  v_enabled BOOLEAN;
BEGIN
  SELECT * INTO v_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- If preferences row doesn't exist (edge case), default to enabled.
  IF NOT FOUND THEN
    v_enabled := true;
  ELSE
    v_enabled := CASE p_type
      WHEN 'webhook_failure' THEN v_prefs.webhook_failure_enabled
      WHEN 'webhook_circuit_open' THEN v_prefs.webhook_circuit_open_enabled
      WHEN 'storage_quota_warning' THEN v_prefs.storage_quota_warning_enabled
      WHEN 'storage_quota_critical' THEN v_prefs.storage_quota_critical_enabled
      WHEN 'media_processing_complete' THEN v_prefs.media_processing_complete_enabled
      WHEN 'media_processing_failed' THEN v_prefs.media_processing_failed_enabled
      WHEN 'system_announcement' THEN v_prefs.system_announcement_enabled
      WHEN 'security_alert' THEN v_prefs.security_alert_enabled
      ELSE true
    END;
  END IF;

  IF p_priority = 'critical' OR p_type = 'security_alert' THEN
    v_enabled := true;
  END IF;

  IF NOT v_enabled THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    priority,
    title,
    message,
    action_url,
    action_label,
    metadata,
    expires_at
  ) VALUES (
    p_user_id,
    p_type,
    p_priority,
    p_title,
    p_message,
    p_action_url,
    p_action_label,
    p_metadata,
    CASE
      WHEN p_expires_in_hours IS NOT NULL THEN now() + make_interval(hours => p_expires_in_hours)
      ELSE NULL
    END
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Mark read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET read = true,
      read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Mark all read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET read = true,
      read_at = now()
  WHERE user_id = auth.uid()
    AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Archive
CREATE OR REPLACE FUNCTION public.archive_notification(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET archived = true,
      archived_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cleanup (manual/scheduled later)
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < now();

  DELETE FROM public.notifications
  WHERE archived = true
    AND archived_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: notify webhook failures (5+ in last hour, cooldown 30m per webhook)
CREATE OR REPLACE FUNCTION public.notify_webhook_failures()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook RECORD;
  v_recent_failures INTEGER;
  v_now TIMESTAMPTZ;
  v_webhook_id TEXT;
BEGIN
  v_now := coalesce(NEW.executed_at, now());

  SELECT * INTO v_webhook
  FROM public.webhooks
  WHERE id = NEW.webhook_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_recent_failures
  FROM public.webhook_logs wl
  WHERE wl.webhook_id = NEW.webhook_id
    AND coalesce(wl.executed_at, wl.created_at, now()) >= now() - interval '1 hour'
    AND (
      wl.success IS DISTINCT FROM true
      OR (wl.response_status IS NOT NULL AND wl.response_status >= 400)
      OR wl.error_message IS NOT NULL
    );

  IF v_recent_failures >= 5 THEN
    v_webhook_id := NEW.webhook_id::text;

    -- cooldown: don't spam the same webhook failure notification too often
    IF NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = v_webhook.user_id
        AND n.type = 'webhook_failure'
        AND (n.metadata->>'webhook_id') = v_webhook_id
        AND n.created_at >= now() - interval '30 minutes'
    ) THEN
      PERFORM public.create_notification(
        v_webhook.user_id,
        'webhook_failure',
        'Webhook com múltiplas falhas',
        v_webhook.name || ' teve ' || v_recent_failures || ' falhas na última hora.',
        'high',
        '/dashboard/configuracoes?tab=integracoes',
        'Ver Integrações',
        jsonb_build_object('webhook_id', v_webhook_id, 'failure_count', v_recent_failures),
        24
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_webhook_failures_trigger ON public.webhook_logs;
CREATE TRIGGER notify_webhook_failures_trigger
AFTER INSERT ON public.webhook_logs
FOR EACH ROW
WHEN (
  NEW.success IS DISTINCT FROM true
  OR (NEW.response_status IS NOT NULL AND NEW.response_status >= 400)
  OR NEW.error_message IS NOT NULL
)
EXECUTE FUNCTION public.notify_webhook_failures();

-- Trigger: notify circuit breaker open
CREATE OR REPLACE FUNCTION public.notify_circuit_breaker_open()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook RECORD;
BEGIN
  IF NEW.state = 'open' AND (TG_OP = 'INSERT' OR OLD.state IS DISTINCT FROM 'open') THEN
    SELECT * INTO v_webhook
    FROM public.webhooks
    WHERE id = NEW.webhook_id;

    IF FOUND THEN
      PERFORM public.create_notification(
        v_webhook.user_id,
        'webhook_circuit_open',
        'Circuit Breaker ativado',
        'O webhook "' || v_webhook.name || '" foi temporariamente desabilitado devido a falhas consecutivas.',
        'critical',
        '/dashboard/configuracoes?tab=integracoes',
        'Ver Integrações',
        jsonb_build_object('webhook_id', NEW.webhook_id::text),
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_circuit_breaker_trigger ON public.webhook_circuit_breaker;
CREATE TRIGGER notify_circuit_breaker_trigger
AFTER INSERT OR UPDATE ON public.webhook_circuit_breaker
FOR EACH ROW
EXECUTE FUNCTION public.notify_circuit_breaker_open();

-- Trigger: notify storage quota thresholds crossed (80%/95%)
CREATE OR REPLACE FUNCTION public.notify_storage_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_new_pct NUMERIC;
  v_old_pct NUMERIC;
BEGIN
  v_new_pct := (NEW.total_size_bytes::numeric / NULLIF(NEW.max_size_bytes::numeric, 0)) * 100;
  v_old_pct := (OLD.total_size_bytes::numeric / NULLIF(OLD.max_size_bytes::numeric, 0)) * 100;

  -- Crossed 80%
  IF v_old_pct < 80 AND v_new_pct >= 80 AND v_new_pct < 95 THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'storage_quota_warning',
      'Storage em 80%',
      'Você está usando ' || floor(v_new_pct)::int || '% da sua quota de storage.',
      'medium',
      '/dashboard/analytics',
      'Ver Analytics',
      jsonb_build_object('percentage', v_new_pct, 'used_bytes', NEW.total_size_bytes, 'max_bytes', NEW.max_size_bytes),
      72
    );
  END IF;

  -- Crossed 95%
  IF v_old_pct < 95 AND v_new_pct >= 95 THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'storage_quota_critical',
      'Storage quase cheio!',
      'Você está usando ' || floor(v_new_pct)::int || '% da sua quota. Considere excluir arquivos antigos.',
      'critical',
      '/dashboard/analytics',
      'Gerenciar Storage',
      jsonb_build_object('percentage', v_new_pct, 'used_bytes', NEW.total_size_bytes, 'max_bytes', NEW.max_size_bytes),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_storage_quota_trigger ON public.user_storage_quotas;
CREATE TRIGGER notify_storage_quota_trigger
AFTER UPDATE ON public.user_storage_quotas
FOR EACH ROW
WHEN (NEW.total_size_bytes IS DISTINCT FROM OLD.total_size_bytes)
EXECUTE FUNCTION public.notify_storage_quota();
