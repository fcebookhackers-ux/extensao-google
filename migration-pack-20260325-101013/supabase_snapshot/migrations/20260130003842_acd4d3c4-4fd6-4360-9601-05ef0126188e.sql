-- Webhook templates: providers enum
DO $$ BEGIN
  CREATE TYPE public.webhook_provider AS ENUM (
    'zapier',
    'make',
    'n8n',
    'discord',
    'slack',
    'webhook_site',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Templates table
CREATE TABLE IF NOT EXISTS public.webhook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider public.webhook_provider NOT NULL,
  description TEXT,
  logo_url TEXT,
  documentation_url TEXT,
  default_events TEXT[] NOT NULL DEFAULT '{}'::text[],
  default_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_template JSONB,
  requires_auth BOOLEAN NOT NULL DEFAULT false,
  auth_type TEXT,
  config_schema JSONB,
  example_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_templates_provider ON public.webhook_templates(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_templates_active ON public.webhook_templates(is_active);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_webhook_templates_updated_at ON public.webhook_templates;
CREATE TRIGGER trg_webhook_templates_updated_at
BEFORE UPDATE ON public.webhook_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (public read-only)
ALTER TABLE public.webhook_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read webhook templates" ON public.webhook_templates;
CREATE POLICY "Public can read webhook templates"
ON public.webhook_templates
FOR SELECT
USING (true);

-- Ensure clients cannot write templates (no INSERT/UPDATE/DELETE policies)

-- Extend user webhooks table to store template provenance and optional payload template
ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS template_id UUID NULL REFERENCES public.webhook_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_provider public.webhook_provider NULL,
  ADD COLUMN IF NOT EXISTS payload_template JSONB NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_webhooks_template_id ON public.webhooks(template_id);

-- Seed default templates (idempotent by provider)
INSERT INTO public.webhook_templates (name, provider, description, logo_url, documentation_url, default_events, default_headers, payload_template, example_url)
SELECT * FROM (
  VALUES
  (
    'Zapier',
    'zapier'::public.webhook_provider,
    'Integre com milhares de apps usando Zapier',
    'https://cdn.zapier.com/zapier/images/logos/zapier-logomark.png',
    'https://zapier.com/help/create/code-webhooks',
    ARRAY['automation.activated','message.sent','contact.created']::text[],
    '{"Content-Type":"application/json"}'::jsonb,
    '{"event":"{{event_type}}","timestamp":"{{timestamp}}","data":"{{data}}"}'::jsonb,
    'https://hooks.zapier.com/hooks/catch/123456/abcdef/'
  ),
  (
    'Make (Integromat)',
    'make'::public.webhook_provider,
    'Automação visual com Make',
    'https://www.make.com/en/make-brand/make-icon.svg',
    'https://www.make.com/en/help/tools/webhooks',
    ARRAY['automation.activated','message.sent','contact.created']::text[],
    '{"Content-Type":"application/json"}'::jsonb,
    '{"event_type":"{{event_type}}","timestamp":"{{timestamp}}","payload":"{{data}}"}'::jsonb,
    'https://hook.eu1.make.com/abcdefghijklmnop'
  ),
  (
    'n8n',
    'n8n'::public.webhook_provider,
    'Automação open-source com n8n',
    'https://n8n.io/favicon.ico',
    'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/',
    ARRAY['automation.activated','message.sent','contact.created']::text[],
    '{"Content-Type":"application/json"}'::jsonb,
    '{"event":"{{event_type}}","data":"{{data}}","metadata":{"timestamp":"{{timestamp}}","source":"zapflow"}}'::jsonb,
    'https://your-n8n.com/webhook/zapflow'
  ),
  (
    'Discord Webhook',
    'discord'::public.webhook_provider,
    'Envie notificações para canal do Discord',
    'https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico',
    'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
    ARRAY['automation.activated','message.failed']::text[],
    '{"Content-Type":"application/json"}'::jsonb,
    '{"content":null,"embeds":[{"title":"{{event_type}}","description":"{{data.message}}","color":5814783,"timestamp":"{{timestamp}}"}]}'::jsonb,
    'https://discord.com/api/webhooks/123456789/abcdefghijklmnop'
  ),
  (
    'Slack Incoming Webhook',
    'slack'::public.webhook_provider,
    'Envie mensagens para canais do Slack',
    'https://slack.com/favicon.ico',
    'https://api.slack.com/messaging/webhooks',
    ARRAY['automation.activated','message.failed','contact.created']::text[],
    '{"Content-Type":"application/json"}'::jsonb,
    '{"text":"{{event_type}}","blocks":[{"type":"section","text":{"type":"mrkdwn","text":"*Evento:* {{event_type}}\\n*Detalhes:* {{data.message}}"}}]}'::jsonb,
    'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX'
  ),
  (
    'Webhook.site (Teste)',
    'webhook_site'::public.webhook_provider,
    'Use para testar e debugar webhooks',
    'https://webhook.site/favicon.ico',
    'https://webhook.site/',
    ARRAY['automation.activated']::text[],
    '{"Content-Type":"application/json"}'::jsonb,
    '{"event":"{{event_type}}","timestamp":"{{timestamp}}","data":"{{data}}"}'::jsonb,
    'https://webhook.site/your-unique-url'
  ),
  (
    'Custom Webhook',
    'custom'::public.webhook_provider,
    'Configure manualmente seu webhook personalizado',
    NULL,
    NULL,
    ARRAY['automation.activated']::text[],
    '{"Content-Type":"application/json"}'::jsonb,
    '{"event_type":"{{event_type}}","timestamp":"{{timestamp}}","data":"{{data}}"}'::jsonb,
    'https://your-api.com/webhook'
  )
) AS v(name, provider, description, logo_url, documentation_url, default_events, default_headers, payload_template, example_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.webhook_templates t WHERE t.provider = v.provider
);