-- Fix notify_webhook_failures: webhook_logs does not guarantee created_at column

CREATE OR REPLACE FUNCTION public.notify_webhook_failures()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook RECORD;
  v_recent_failures INTEGER;
  v_webhook_id TEXT;
BEGIN
  SELECT * INTO v_webhook
  FROM public.webhooks
  WHERE id = NEW.webhook_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_recent_failures
  FROM public.webhook_logs wl
  WHERE wl.webhook_id = NEW.webhook_id
    AND coalesce(wl.executed_at, now()) >= now() - interval '1 hour'
    AND (
      wl.success IS DISTINCT FROM true
      OR (wl.response_status IS NOT NULL AND wl.response_status >= 400)
      OR wl.error_message IS NOT NULL
    );

  IF v_recent_failures >= 5 THEN
    v_webhook_id := NEW.webhook_id::text;

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
