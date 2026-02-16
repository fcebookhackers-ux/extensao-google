-- LGPD server-side deletion/anonymization: transactional RPC + supporting columns + notify trigger

-- 1) Extend data_deletion_requests with processing metadata (non-breaking)
ALTER TABLE public.data_deletion_requests
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- 2) Add soft-delete fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3) pg_notify helper trigger when status becomes 'approved'
CREATE OR REPLACE FUNCTION public.notify_data_deletion_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM pg_notify(
      'data_deletion_approved',
      jsonb_build_object(
        'request_id', NEW.id,
        'user_id', NEW.user_id,
        'approved_at', now()
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_data_deletion_approved ON public.data_deletion_requests;
CREATE TRIGGER trg_notify_data_deletion_approved
AFTER UPDATE OF status ON public.data_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_data_deletion_approved();

-- 4) Transactional RPC to anonymize/delete user data.
-- NOTE: Storage deletions are performed in Edge Function before calling this RPC.
CREATE OR REPLACE FUNCTION public.process_data_deletion(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.data_deletion_requests%ROWTYPE;
  v_user_id uuid;

  v_deleted_webhooks integer := 0;
  v_deleted_webhook_logs integer := 0;
  v_deleted_webhook_conditions integer := 0;
  v_deleted_webhook_retry_queue integer := 0;
  v_deleted_webhook_retry_config integer := 0;
  v_deleted_webhook_circuit integer := 0;
  v_deleted_webhook_rate_limit integer := 0;

  v_anonymized_messages integer := 0;
  v_anonymized_contacts integer := 0;

  v_deleted_media integer := 0;
  v_deleted_media_tag_assignments integer := 0;
  v_deleted_media_tags integer := 0;

  v_deleted_automation_versions integer := 0;
  v_deleted_automation_variables integer := 0;
  v_deleted_automations integer := 0;

  v_deleted_audit_events integer := 0;

  v_counts jsonb;
BEGIN
  SELECT * INTO v_req
  FROM public.data_deletion_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de exclusão não encontrada';
  END IF;

  v_user_id := v_req.user_id;

  IF v_req.status = 'completed' THEN
    RETURN COALESCE(v_req.metadata, '{}'::jsonb);
  END IF;

  IF v_req.status NOT IN ('approved', 'processing', 'scheduled', 'pending') THEN
    RAISE EXCEPTION 'Status inválido para processamento: %', v_req.status;
  END IF;

  -- Mark processing (DB side)
  UPDATE public.data_deletion_requests
  SET status = 'processing'
  WHERE id = p_request_id;

  -- 4.1) Messages: anonymize content
  UPDATE public.messages
  SET content = '[REMOVIDO]',
      metadata = '{}'::jsonb,
      updated_at = now()
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_anonymized_messages = ROW_COUNT;

  -- 4.2) Contacts: anonymize PII but keep rows to preserve FK integrity
  UPDATE public.contacts
  SET name = '[REMOVIDO]',
      phone = NULL,
      email = NULL,
      tags = '{}'::text[],
      custom_fields = '{}'::jsonb,
      status = 'deleted',
      updated_at = now()
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_anonymized_contacts = ROW_COUNT;

  -- 4.3) Webhooks + related
  -- Delete children first
  DELETE FROM public.webhook_logs wl
  USING public.webhooks w
  WHERE wl.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_logs = ROW_COUNT;

  DELETE FROM public.webhook_conditions wc
  USING public.webhooks w
  WHERE wc.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_conditions = ROW_COUNT;

  DELETE FROM public.webhook_retry_queue wrq
  USING public.webhooks w
  WHERE wrq.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_retry_queue = ROW_COUNT;

  DELETE FROM public.webhook_retry_config wrc
  USING public.webhooks w
  WHERE wrc.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_retry_config = ROW_COUNT;

  DELETE FROM public.webhook_circuit_breaker wcb
  USING public.webhooks w
  WHERE wcb.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_circuit = ROW_COUNT;

  DELETE FROM public.webhook_rate_limit wrl
  USING public.webhooks w
  WHERE wrl.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_rate_limit = ROW_COUNT;

  DELETE FROM public.webhooks
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhooks = ROW_COUNT;

  -- 4.4) Media tables (storage is deleted in Edge Function)
  DELETE FROM public.media_tag_assignments mta
  USING public.media_library ml
  WHERE mta.media_id = ml.id
    AND ml.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_media_tag_assignments = ROW_COUNT;

  DELETE FROM public.media_library
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_media = ROW_COUNT;

  DELETE FROM public.media_tags
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_media_tags = ROW_COUNT;

  -- 4.5) Automations
  DELETE FROM public.automation_versions av
  USING public.automations a
  WHERE av.automation_id = a.id
    AND a.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_automation_versions = ROW_COUNT;

  DELETE FROM public.automation_variables v
  USING public.automations a
  WHERE v.automation_id = a.id
    AND a.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_automation_variables = ROW_COUNT;

  DELETE FROM public.automations
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_automations = ROW_COUNT;

  -- 4.6) Optional: audit events (remove history or keep)
  -- Here: keep audit history for security/compliance; do NOT delete.
  v_deleted_audit_events := 0;

  -- 4.7) Soft delete profile
  UPDATE public.profiles
  SET is_deleted = true,
      deleted_at = now(),
      updated_at = now(),
      email = ('deleted+' || v_user_id::text || '@example.invalid')
  WHERE user_id = v_user_id;

  v_counts := jsonb_build_object(
    'request_id', p_request_id,
    'user_id', v_user_id,
    'anonymized_messages', v_anonymized_messages,
    'anonymized_contacts', v_anonymized_contacts,
    'deleted_webhooks', v_deleted_webhooks,
    'deleted_webhook_logs', v_deleted_webhook_logs,
    'deleted_webhook_conditions', v_deleted_webhook_conditions,
    'deleted_webhook_retry_queue', v_deleted_webhook_retry_queue,
    'deleted_webhook_retry_config', v_deleted_webhook_retry_config,
    'deleted_webhook_circuit_breaker', v_deleted_webhook_circuit,
    'deleted_webhook_rate_limit', v_deleted_webhook_rate_limit,
    'deleted_media', v_deleted_media,
    'deleted_media_tag_assignments', v_deleted_media_tag_assignments,
    'deleted_media_tags', v_deleted_media_tags,
    'deleted_automations', v_deleted_automations,
    'deleted_automation_versions', v_deleted_automation_versions,
    'deleted_automation_variables', v_deleted_automation_variables,
    'deleted_audit_events', v_deleted_audit_events,
    'completed_at', now()
  );

  -- 4.8) Mark request completed
  UPDATE public.data_deletion_requests
  SET status = 'completed',
      completed_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('summary', v_counts)
  WHERE id = p_request_id;

  -- 4.9) Audit
  INSERT INTO public.audit_events (user_id, action, entity_type, metadata)
  VALUES (
    v_user_id,
    'data_deletion_completed',
    'user',
    jsonb_build_object('request_id', p_request_id, 'items_deleted', v_counts)
  );

  RETURN v_counts;
END;
$$;
