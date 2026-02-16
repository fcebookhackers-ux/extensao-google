-- Extend vault for one-time reveal + delivery of current+previous during grace window

ALTER TABLE public.webhook_secrets
ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Service role can insert notifications (to alert about rotation)
-- Existing notifications table has RLS; add service-role policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='notifications'
      AND policyname='Service role can insert notifications'
  ) THEN
    CREATE POLICY "Service role can insert notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Also allow service role to select when needed (optional) + update archive/read fields (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='notifications'
      AND policyname='Service role can manage notifications'
  ) THEN
    CREATE POLICY "Service role can manage notifications"
    ON public.notifications
    FOR ALL
    TO authenticated
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Delivery helper: return current secret and, if within grace, previous secret too
CREATE OR REPLACE FUNCTION public.get_webhook_secrets_for_delivery(p_webhook_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cur record;
  v_prev record;
  v_now timestamptz := now();
  v_cur_plain text;
  v_prev_plain text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT encrypted_value, rotated_at
    INTO v_cur
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = true
  ORDER BY rotated_at DESC
  LIMIT 1;

  IF v_cur.encrypted_value IS NULL THEN
    RETURN jsonb_build_object('current', null, 'previous', null);
  END IF;

  v_cur_plain := public.decrypt_webhook_secret(v_cur.encrypted_value);

  -- previous is the most recent inactive secret
  SELECT encrypted_value, grace_expires_at
    INTO v_prev
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = false
  ORDER BY rotated_at DESC
  LIMIT 1;

  IF v_prev.encrypted_value IS NOT NULL AND v_prev.grace_expires_at IS NOT NULL AND v_prev.grace_expires_at > v_now THEN
    v_prev_plain := public.decrypt_webhook_secret(v_prev.encrypted_value);
    RETURN jsonb_build_object(
      'current', v_cur_plain,
      'previous', v_prev_plain,
      'previous_grace_expires_at', v_prev.grace_expires_at
    );
  END IF;

  RETURN jsonb_build_object('current', v_cur_plain, 'previous', null);
END;
$$;