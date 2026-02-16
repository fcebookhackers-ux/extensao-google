-- Cloud integrations (Google Drive / Dropbox)

-- Enums
DO $$ BEGIN
  CREATE TYPE public.cloud_provider AS ENUM ('google_drive', 'dropbox', 'onedrive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_status AS ENUM ('idle', 'syncing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Integrations table
CREATE TABLE IF NOT EXISTS public.cloud_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider public.cloud_provider NOT NULL,

  -- Tokens stored in Supabase Vault (do NOT store plaintext tokens)
  access_token_secret_id UUID NOT NULL,
  refresh_token_secret_id UUID,

  expires_at TIMESTAMPTZ,
  folder_id TEXT,
  folder_name TEXT,

  auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cloud_integrations_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_cloud_integrations_user ON public.cloud_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_integrations_provider ON public.cloud_integrations(provider);

ALTER TABLE public.cloud_integrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can select own integrations"
    ON public.cloud_integrations
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own integrations"
    ON public.cloud_integrations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own integrations"
    ON public.cloud_integrations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own integrations"
    ON public.cloud_integrations
    FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DROP TRIGGER IF EXISTS update_cloud_integrations_updated_at ON public.cloud_integrations;
CREATE TRIGGER update_cloud_integrations_updated_at
BEFORE UPDATE ON public.cloud_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Sync history
CREATE TABLE IF NOT EXISTS public.cloud_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES public.cloud_integrations(id) ON DELETE CASCADE,

  sync_type TEXT NOT NULL, -- 'manual' | 'auto' | 'export'
  status public.sync_status NOT NULL DEFAULT 'idle',

  files_synced INTEGER NOT NULL DEFAULT 0,
  bytes_synced BIGINT NOT NULL DEFAULT 0,
  error_message TEXT,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cloud_sync_history_user ON public.cloud_sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_integration ON public.cloud_sync_history(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON public.cloud_sync_history(status);

ALTER TABLE public.cloud_sync_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own sync history"
    ON public.cloud_sync_history
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own sync history"
    ON public.cloud_sync_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own sync history"
    ON public.cloud_sync_history
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- RPC: upsert integration + store tokens in Vault
CREATE OR REPLACE FUNCTION public.upsert_cloud_integration_tokens(
  p_provider public.cloud_provider,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_folder_id TEXT,
  p_folder_name TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, vault
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_existing public.cloud_integrations;
  v_access_id UUID;
  v_refresh_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_existing
  FROM public.cloud_integrations
  WHERE user_id = v_user_id AND provider = p_provider;

  IF FOUND THEN
    -- Update existing Vault secrets
    PERFORM vault.update_secret(v_existing.access_token_secret_id, p_access_token, 'cloud_access_token', 'Cloud access token');
    v_access_id := v_existing.access_token_secret_id;

    IF p_refresh_token IS NOT NULL AND length(p_refresh_token) > 0 THEN
      IF v_existing.refresh_token_secret_id IS NULL THEN
        v_refresh_id := vault.create_secret(p_refresh_token, 'cloud_refresh_token', 'Cloud refresh token');
      ELSE
        PERFORM vault.update_secret(v_existing.refresh_token_secret_id, p_refresh_token, 'cloud_refresh_token', 'Cloud refresh token');
        v_refresh_id := v_existing.refresh_token_secret_id;
      END IF;
    ELSE
      v_refresh_id := v_existing.refresh_token_secret_id;
    END IF;

    UPDATE public.cloud_integrations
    SET
      refresh_token_secret_id = v_refresh_id,
      expires_at = p_expires_at,
      folder_id = p_folder_id,
      folder_name = p_folder_name
    WHERE id = v_existing.id;

    RETURN v_existing.id;
  END IF;

  -- Create new Vault secrets
  v_access_id := vault.create_secret(p_access_token, 'cloud_access_token', 'Cloud access token');

  IF p_refresh_token IS NOT NULL AND length(p_refresh_token) > 0 THEN
    v_refresh_id := vault.create_secret(p_refresh_token, 'cloud_refresh_token', 'Cloud refresh token');
  ELSE
    v_refresh_id := NULL;
  END IF;

  INSERT INTO public.cloud_integrations (
    user_id, provider,
    access_token_secret_id, refresh_token_secret_id,
    expires_at, folder_id, folder_name
  ) VALUES (
    v_user_id, p_provider,
    v_access_id, v_refresh_id,
    p_expires_at, p_folder_id, p_folder_name
  )
  RETURNING id INTO v_access_id;

  RETURN v_access_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_cloud_integration_tokens(public.cloud_provider, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_cloud_integration_tokens(public.cloud_provider, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- RPC: get decrypted tokens for current user/provider
CREATE OR REPLACE FUNCTION public.get_cloud_integration_tokens(
  p_provider public.cloud_provider
)
RETURNS TABLE(
  integration_id UUID,
  provider public.cloud_provider,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  folder_id TEXT,
  folder_name TEXT,
  auto_sync_enabled BOOLEAN,
  last_sync_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, vault
LANGUAGE sql
AS $$
  SELECT
    ci.id as integration_id,
    ci.provider,
    (SELECT decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.id = ci.access_token_secret_id) AS access_token,
    (SELECT decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.id = ci.refresh_token_secret_id) AS refresh_token,
    ci.expires_at,
    ci.folder_id,
    ci.folder_name,
    ci.auto_sync_enabled,
    ci.last_sync_at
  FROM public.cloud_integrations ci
  WHERE ci.user_id = auth.uid() AND ci.provider = p_provider;
$$;

REVOKE ALL ON FUNCTION public.get_cloud_integration_tokens(public.cloud_provider) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cloud_integration_tokens(public.cloud_provider) TO authenticated;
