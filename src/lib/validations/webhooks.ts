 import { z } from 'zod';
 
 const WEBHOOK_EVENTS = [
   'automation.activated',
   'automation.paused',
   'message.sent',
   'message.delivered',
   'message.failed',
   'contact.created',
   'contact.updated'
 ] as const;
 
 export const webhookSchema = z.object({
   name: z.string()
     .trim()
     .min(1, 'Nome é obrigatório')
     .max(100, 'Nome deve ter no máximo 100 caracteres'),
   
   url: z.string()
     .trim()
     .url('URL inválida')
     .refine(url => url.startsWith('https://'), {
       message: 'Webhook deve usar HTTPS'
     }),
   
   events: z.array(z.enum(WEBHOOK_EVENTS))
     .min(1, 'Selecione pelo menos um evento'),
   
   headers: z.record(z.string(), z.string()).optional().default({}),
   
   is_active: z.boolean().default(true),
   
   retry_config: z.object({
     max_attempts: z.number().int().min(1).max(10).default(3),
     backoff_multiplier: z.number().min(1).max(10).default(2)
    }).optional().default({ max_attempts: 3, backoff_multiplier: 2 }),

    enable_conditions: z.boolean().optional().default(false),
    enable_transformation: z.boolean().optional().default(false),
    // Safe DSL: JSON template as text
    transformation_script: z.string().optional().default(''),
 });
 
 export type WebhookFormData = z.infer<typeof webhookSchema>;