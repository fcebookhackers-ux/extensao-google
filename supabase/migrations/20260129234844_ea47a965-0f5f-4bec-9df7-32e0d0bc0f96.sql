-- Add HTTPS constraint to webhooks table
ALTER TABLE public.webhooks 
ADD CONSTRAINT webhooks_url_must_be_https 
CHECK (url LIKE 'https://%');