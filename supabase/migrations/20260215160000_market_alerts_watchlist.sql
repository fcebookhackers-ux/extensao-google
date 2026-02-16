CREATE TABLE IF NOT EXISTS public.market_watchlist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url TEXT NOT NULL UNIQUE,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('mercado_livre', 'shopee', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  target_price NUMERIC(12,2),
  last_suggested_price NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS public.market_price_alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url TEXT NOT NULL,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('mercado_livre', 'shopee', 'other')),
  previous_price NUMERIC(12,2) NOT NULL,
  current_price NUMERIC(12,2) NOT NULL,
  percent_change NUMERIC(8,4) NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'price_drop',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_market_watchlist_active ON public.market_watchlist (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_price_alerts_created_at ON public.market_price_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_price_alerts_ack ON public.market_price_alerts (acknowledged_at, created_at DESC);

ALTER TABLE public.market_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'market_watchlist' AND policyname = 'market_watchlist_service_role'
  ) THEN
    CREATE POLICY market_watchlist_service_role
      ON public.market_watchlist
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'market_price_alerts' AND policyname = 'market_price_alerts_service_role'
  ) THEN
    CREATE POLICY market_price_alerts_service_role
      ON public.market_price_alerts
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

REVOKE ALL ON TABLE public.market_watchlist FROM anon, authenticated;
REVOKE ALL ON TABLE public.market_price_alerts FROM anon, authenticated;
