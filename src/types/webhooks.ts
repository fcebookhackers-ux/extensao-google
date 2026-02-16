 export type WebhookEvent = 
   | 'automation.activated'
   | 'automation.paused'
   | 'message.sent'
   | 'message.delivered'
   | 'message.failed'
   | 'contact.created'
   | 'contact.updated';
 
 export interface Webhook {
   id: string;
   user_id: string;
   name: string;
   url: string;
   secret?: string;
   events: WebhookEvent[];
   headers: Record<string, string>;
   is_active: boolean;
    enable_transformation?: boolean;
    transformation_script?: string | null;
    enable_conditions?: boolean;
    conditions?: Record<string, any> | null;
    template_id?: string | null;
    template_provider?:
      | 'zapier'
      | 'make'
      | 'n8n'
      | 'discord'
      | 'slack'
      | 'webhook_site'
      | 'custom'
      | null;
    payload_template?: Record<string, any> | null;
    metadata?: Record<string, any>;
   retry_config: {
     max_attempts: number;
     backoff_multiplier: number;
   };
   created_at: string;
   updated_at: string;
 }
 
 export interface WebhookLog {
   id: string;
   webhook_id: string;
   event_type: WebhookEvent;
   payload: Record<string, any>;
   request_headers?: Record<string, string>;
   response_status?: number;
   response_body?: string;
   error_message?: string;
   attempt_number: number;
   executed_at: string;
   success: boolean;
 }