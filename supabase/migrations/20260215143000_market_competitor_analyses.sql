-- Marketplace competitor analysis history (extension/API)

CREATE TABLE IF NOT EXISTS public.market_competitor_analyses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url TEXT NOT NULL,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('mercado_livre', 'shopee', 'other')),
  suggested_price NUMERIC(12,2) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  trend JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_market_competitor_analyses_created_at
  ON public.market_competitor_analyses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_competitor_analyses_marketplace_created_at
  ON public.market_competitor_analyses (marketplace, created_at DESC);

ALTER TABLE public.market_competitor_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'market_competitor_analyses'
      AND policyname = 'market_competitor_analyses_service_role'
  ) THEN
    CREATE POLICY market_competitor_analyses_service_role
      ON public.market_competitor_analyses
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

REVOKE ALL ON TABLE public.market_competitor_analyses FROM anon, authenticated;
