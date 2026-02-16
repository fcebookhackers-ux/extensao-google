-- Webhook debugging: store request/response headers and status text in logs
ALTER TABLE public.webhook_logs
ADD COLUMN IF NOT EXISTS request_headers jsonb,
ADD COLUMN IF NOT EXISTS response_headers jsonb,
ADD COLUMN IF NOT EXISTS status_text text;

COMMENT ON COLUMN public.webhook_logs.request_headers IS 'Headers sent to the webhook endpoint at execution time.';
COMMENT ON COLUMN public.webhook_logs.response_headers IS 'Response headers returned by the webhook endpoint.';
COMMENT ON COLUMN public.webhook_logs.status_text IS 'HTTP status text returned by the webhook endpoint (best-effort).';

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id_executed_at
ON public.webhook_logs (webhook_id, executed_at DESC);