export type WebhookProvider =
  | "zapier"
  | "make"
  | "n8n"
  | "discord"
  | "slack"
  | "webhook_site"
  | "custom";

export interface WebhookTemplate {
  id: string;
  name: string;
  provider: WebhookProvider;
  description: string | null;
  logo_url: string | null;
  documentation_url: string | null;
  default_events: string[];
  default_headers: Record<string, string>;
  payload_template: Record<string, any> | null;
  requires_auth: boolean;
  auth_type: string | null;
  config_schema: Record<string, any> | null;
  example_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookFromTemplate {
  templateId: string;
  url: string;
  name?: string;
  events?: string[];
  headers?: Record<string, string>;
  customPayloadTemplate?: Record<string, any> | null;
}
