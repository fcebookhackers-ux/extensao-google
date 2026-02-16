-- Nonce store to protect against replay attacks when verifying signatures (test endpoint)
CREATE TABLE IF NOT EXISTS public.webhook_signature_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  signature_hex text NOT NULL,
  timestamp_ms bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_signature_nonces_lookup
  ON public.webhook_signature_nonces (webhook_id, signature_hex);

CREATE INDEX IF NOT EXISTS idx_webhook_signature_nonces_expires
  ON public.webhook_signature_nonces (expires_at);

ALTER TABLE public.webhook_signature_nonces ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage (verification endpoint uses service_role)
DROP POLICY IF EXISTS webhook_signature_nonces_service_role ON public.webhook_signature_nonces;
CREATE POLICY webhook_signature_nonces_service_role
ON public.webhook_signature_nonces
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Purge helper
CREATE OR REPLACE FUNCTION public.purge_expired_webhook_signature_nonces()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.webhook_signature_nonces
  WHERE expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;