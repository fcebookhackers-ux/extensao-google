-- Mark secrets created via create_webhook_secret_once as claimed (since it returns plaintext)

CREATE OR REPLACE FUNCTION public.create_webhook_secret_once(p_webhook_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing record;
  v_secret text;
  v_last4 text;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.webhooks
  WHERE id = p_webhook_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Webhook not found';
  END IF;

  IF v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id, secret_last4 INTO v_existing
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = true
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- Already created; do not reveal again
    RETURN jsonb_build_object(
      'created', false,
      'secret', null,
      'last4', v_existing.secret_last4
    );
  END IF;

  v_secret := encode(gen_random_bytes(32), 'hex');
  v_last4 := right(v_secret, 4);

  INSERT INTO public.webhook_secrets (
    user_id,
    webhook_id,
    encrypted_value,
    secret_last4,
    rotated_at,
    expires_at,
    grace_expires_at,
    active,
    claimed_at
  ) VALUES (
    v_user_id,
    p_webhook_id,
    public.encrypt_webhook_secret(v_secret),
    v_last4,
    now(),
    now() + interval '90 days',
    now() + interval '97 days',
    true,
    now()
  );

  RETURN jsonb_build_object(
    'created', true,
    'secret', v_secret,
    'last4', v_last4
  );
END;
$$;