-- Secure webhook secrets vault (pgcrypto)

-- 1) Crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Master key storage (generated in DB, readable only by service role through SECURITY DEFINER functions)
CREATE TABLE IF NOT EXISTS public.app_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL UNIQUE,
  key_bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.app_encryption_keys ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon. Service role bypasses RLS.

-- Ensure one active key exists (idempotent)
INSERT INTO public.app_encryption_keys (key_name, key_bytes, is_active)
SELECT 'webhook_secrets_master', gen_random_bytes(32), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_encryption_keys WHERE key_name = 'webhook_secrets_master'
);

-- 3) Vault table
CREATE TABLE IF NOT EXISTS public.webhook_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  webhook_id uuid NOT NULL,
  encrypted_value text NOT NULL, -- base64 ciphertext
  secret_last4 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  grace_expires_at timestamptz NOT NULL DEFAULT (now() + interval '97 days'),
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_webhook_secrets_webhook_id ON public.webhook_secrets (webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_secrets_user_id ON public.webhook_secrets (user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_secrets_rotation_due ON public.webhook_secrets (expires_at) WHERE active = true;

-- Only one active secret per webhook
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_webhook_active_secret'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uniq_webhook_active_secret ON public.webhook_secrets (webhook_id) WHERE active = true';
  END IF;
END $$;

ALTER TABLE public.webhook_secrets ENABLE ROW LEVEL SECURITY;

-- Grants: authenticated can see only non-sensitive columns of their own rows.
REVOKE ALL ON TABLE public.webhook_secrets FROM anon, authenticated;
GRANT SELECT (id, webhook_id, secret_last4, created_at, rotated_at, expires_at, grace_expires_at, active) ON TABLE public.webhook_secrets TO authenticated;

CREATE POLICY "Users can view webhook secret status"
ON public.webhook_secrets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4) Helpers
CREATE OR REPLACE FUNCTION public.get_active_master_key_bytes(p_key_name text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key bytea;
BEGIN
  SELECT key_bytes INTO v_key
  FROM public.app_encryption_keys
  WHERE key_name = p_key_name
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Master key not configured';
  END IF;

  RETURN v_key;
END;
$$;

-- Encrypt/decrypt using AES via pgcrypto (sym key stored in app_encryption_keys)
CREATE OR REPLACE FUNCTION public.encrypt_webhook_secret(p_secret_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key bytea;
BEGIN
  v_key := public.get_active_master_key_bytes('webhook_secrets_master');
  RETURN encode(encrypt(p_secret_text::bytea, v_key, 'aes'), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_webhook_secret(p_encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key bytea;
BEGIN
  -- Only service role may decrypt
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_key := public.get_active_master_key_bytes('webhook_secrets_master');
  RETURN convert_from(decrypt(decode(p_encrypted_text, 'base64'), v_key, 'aes'), 'UTF8');
END;
$$;

-- 5) Create secret ONCE (returns plaintext only on first creation)
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
    active
  ) VALUES (
    v_user_id,
    p_webhook_id,
    public.encrypt_webhook_secret(v_secret),
    v_last4,
    now(),
    now() + interval '90 days',
    now() + interval '97 days',
    true
  );

  RETURN jsonb_build_object(
    'created', true,
    'secret', v_secret,
    'last4', v_last4
  );
END;
$$;

-- 6) Retrieve secret for delivery (service role only)
CREATE OR REPLACE FUNCTION public.get_webhook_secret_for_delivery(p_webhook_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT encrypted_value INTO v_row
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = true
  LIMIT 1;

  IF v_row.encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.decrypt_webhook_secret(v_row.encrypted_value);
END;
$$;

-- 7) Rotation (service role only): rotates any active secret past expires_at
CREATE OR REPLACE FUNCTION public.rotate_due_webhook_secrets(p_rotation_days integer DEFAULT 90, p_grace_days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
  v_new_secret text;
  v_last4 text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR r IN
    SELECT ws.id, ws.user_id, ws.webhook_id
    FROM public.webhook_secrets ws
    WHERE ws.active = true
      AND ws.expires_at <= now()
    FOR UPDATE
  LOOP
    -- deactivate current
    UPDATE public.webhook_secrets
    SET active = false
    WHERE id = r.id;

    -- create next
    v_new_secret := encode(gen_random_bytes(32), 'hex');
    v_last4 := right(v_new_secret, 4);

    INSERT INTO public.webhook_secrets (
      user_id,
      webhook_id,
      encrypted_value,
      secret_last4,
      rotated_at,
      expires_at,
      grace_expires_at,
      active
    ) VALUES (
      r.user_id,
      r.webhook_id,
      public.encrypt_webhook_secret(v_new_secret),
      v_last4,
      now(),
      now() + make_interval(days => GREATEST(p_rotation_days, 1)),
      now() + make_interval(days => GREATEST(p_rotation_days + p_grace_days, 1)),
      true
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 8) Enforce "vault-only": prevent storing plaintext secret on webhooks.secret (legacy field)
CREATE OR REPLACE FUNCTION public.prevent_plaintext_webhook_secret()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.secret IS NOT NULL AND length(trim(NEW.secret)) > 0 THEN
    RAISE EXCEPTION 'Plaintext webhook.secret is forbidden; use vault';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_plaintext_webhook_secret'
  ) THEN
    CREATE TRIGGER trg_prevent_plaintext_webhook_secret
    BEFORE INSERT OR UPDATE ON public.webhooks
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_plaintext_webhook_secret();
  END IF;
END $$;

-- 9) Break old behavior explicitly: null out any existing plaintext secrets
UPDATE public.webhooks SET secret = NULL WHERE secret IS NOT NULL;