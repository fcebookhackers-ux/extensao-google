-- Media & Webhooks base schema
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_user_created ON public.media_library(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_media_tags ON public.media_library USING GIN(tags);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL,
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  retry_config JSONB DEFAULT '{"max_attempts": 3, "backoff_multiplier": 2}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_active ON public.webhooks(user_id, is_active);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_headers JSONB,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_executed 
ON public.webhook_logs(webhook_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_success 
ON public.webhook_logs(webhook_id, success, executed_at DESC);

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS for media_library
DO $$ BEGIN
  CREATE POLICY "Users can view own media"
  ON public.media_library FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own media"
  ON public.media_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own media"
  ON public.media_library FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own media"
  ON public.media_library FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS for webhooks
DO $$ BEGIN
  CREATE POLICY "Users can view own webhooks"
  ON public.webhooks FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own webhooks"
  ON public.webhooks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS for webhook_logs
DO $$ BEGIN
  CREATE POLICY "Users can view logs of own webhooks"
  ON public.webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhooks
      WHERE public.webhooks.id = public.webhook_logs.webhook_id
        AND public.webhooks.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cleanup function for old webhook logs
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.webhook_logs
  WHERE executed_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to enqueue webhook execution
CREATE OR REPLACE FUNCTION public.trigger_webhook(
  p_webhook_id UUID,
  p_event_type TEXT,
  p_payload JSONB
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.webhook_logs (
    webhook_id,
    event_type,
    payload,
    attempt_number
  ) VALUES (
    p_webhook_id,
    p_event_type,
    p_payload,
    1
  ) RETURNING id INTO log_id;

  PERFORM pg_notify('webhook_trigger', json_build_object(
    'log_id', log_id,
    'webhook_id', p_webhook_id
  )::text);

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Storage buckets and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-library', 'media-library', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- media-library bucket policies
DO $$ BEGIN
  CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-library' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media-library' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media-library' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- thumbnails bucket policies
DO $$ BEGIN
  CREATE POLICY "Users can upload own thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own thumbnails"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;