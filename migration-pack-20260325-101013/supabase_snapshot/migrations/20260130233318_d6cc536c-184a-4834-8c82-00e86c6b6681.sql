-- Add file_path to data_export_requests for reliable storage cleanup
ALTER TABLE public.data_export_requests
ADD COLUMN IF NOT EXISTS file_path TEXT;

CREATE INDEX IF NOT EXISTS idx_data_export_requests_status_completed_at
ON public.data_export_requests (status, completed_at);

-- Metrics table for cleanup runs
CREATE TABLE IF NOT EXISTS public.cleanup_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  deleted_exports_count INTEGER NOT NULL DEFAULT 0,
  deleted_webhook_logs_count INTEGER NOT NULL DEFAULT 0,
  deleted_rate_limit_events_count INTEGER NOT NULL DEFAULT 0,
  deleted_audit_events_count INTEGER NOT NULL DEFAULT 0,
  deleted_orphan_uploads_count INTEGER NOT NULL DEFAULT 0,
  freed_bytes BIGINT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cleanup_metrics_run_at
ON public.cleanup_metrics (run_at DESC);

-- Secure metrics table (service role only by default)
ALTER TABLE public.cleanup_metrics ENABLE ROW LEVEL SECURITY;