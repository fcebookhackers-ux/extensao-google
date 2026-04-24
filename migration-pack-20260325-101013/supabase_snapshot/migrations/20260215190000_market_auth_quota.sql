-- Per-user auth + quota enforcement for extension/API

-- 1) Add user_id to existing tables (nullable to preserve existing rows)
ALTER TABLE IF EXISTS public.market_competitor_analyses
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE IF EXISTS public.market_watchlist
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE IF EXISTS public.market_price_alerts
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2) Fix watchlist uniqueness to be per-user
ALTER TABLE IF EXISTS public.market_watchlist
  DROP CONSTRAINT IF EXISTS market_watchlist_source_url_key;

CREATE UNIQUE INDEX IF NOT EXISTS ux_market_watchlist_user_url
  ON public.market_watchlist (user_id, source_url);

CREATE INDEX IF NOT EXISTS idx_market_competitor_analyses_user_created_at
  ON public.market_competitor_analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_price_alerts_user_created_at
  ON public.market_price_alerts (user_id, created_at DESC);

-- 3) Plan + usage tables (service_role only)
CREATE TABLE IF NOT EXISTS public.market_user_plans (
  user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  daily_analysis_limit INTEGER NOT NULL DEFAULT 10,
  watchlist_limit INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS public.market_usage_daily (
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  analyses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_market_usage_daily_day
  ON public.market_usage_daily (day DESC);

ALTER TABLE public.market_user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_usage_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'market_user_plans' AND policyname = 'market_user_plans_service_role'
  ) THEN
    CREATE POLICY market_user_plans_service_role
      ON public.market_user_plans
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'market_usage_daily' AND policyname = 'market_usage_daily_service_role'
  ) THEN
    CREATE POLICY market_usage_daily_service_role
      ON public.market_usage_daily
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

REVOKE ALL ON TABLE public.market_user_plans FROM anon, authenticated;
REVOKE ALL ON TABLE public.market_usage_daily FROM anon, authenticated;

-- 4) RPC to enforce quota (service_role only)
CREATE OR REPLACE FUNCTION public.consume_analysis_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  -- Ensure plan exists
  INSERT INTO public.market_user_plans (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT daily_analysis_limit INTO v_limit
  FROM public.market_user_plans
  WHERE user_id = p_user_id;

  IF v_limit IS NULL THEN
    v_limit := 10;
  END IF;

  INSERT INTO public.market_usage_daily (user_id, day, analyses_count)
  VALUES (p_user_id, current_date, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  UPDATE public.market_usage_daily
  SET analyses_count = analyses_count + 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND day = current_date
  RETURNING analyses_count INTO v_count;

  IF v_count > v_limit THEN
    UPDATE public.market_usage_daily
    SET analyses_count = analyses_count - 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND day = current_date;

    RETURN jsonb_build_object('allowed', false, 'limit', v_limit, 'count', v_count - 1);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'limit', v_limit, 'count', v_count);
END $$;

REVOKE ALL ON FUNCTION public.consume_analysis_quota(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_analysis_quota(UUID) TO service_role;
