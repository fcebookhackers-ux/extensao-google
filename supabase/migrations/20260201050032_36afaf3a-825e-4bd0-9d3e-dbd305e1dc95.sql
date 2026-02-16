-- 1) Tabela de cache para signed URLs
CREATE TABLE IF NOT EXISTS public.signed_url_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL UNIQUE,
  signed_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_signed_url_cache_expires ON public.signed_url_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_signed_url_cache_path ON public.signed_url_cache(file_path);

-- 2) Segurança: habilitar RLS e permitir acesso somente via service_role
ALTER TABLE public.signed_url_cache ENABLE ROW LEVEL SECURITY;

-- Bloqueia acesso público/anon/authenticated (sem políticas para esses papéis)
-- e permite operações apenas para service_role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'signed_url_cache'
      AND policyname = 'service_role_manage_signed_url_cache'
  ) THEN
    CREATE POLICY service_role_manage_signed_url_cache
    ON public.signed_url_cache
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;