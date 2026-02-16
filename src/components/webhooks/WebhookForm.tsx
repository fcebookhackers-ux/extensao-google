 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { useCreateWebhook, useUpdateWebhook } from '@/hooks/useWebhooks';
 import { webhookSchema, type WebhookFormData } from '@/lib/validations/webhooks';
 import type { Webhook } from '@/types/webhooks';
import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { useWebhookSecretStatus } from '@/hooks/useWebhookSecrets';
import { useWebhookValidation } from '@/hooks/useWebhookValidation';
import { ConditionBuilder } from '@/components/webhooks/ConditionBuilder';
import { PayloadTransformer } from '@/components/webhooks/PayloadTransformer';
import { useSaveWebhookConditions, useWebhookConditions } from '@/hooks/useWebhookConditions';
import type { WebhookCondition } from '@/types/webhook-transformation';
 import {
   Form,
   FormControl,
   FormDescription,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from '@/components/ui/form';
 
 const WEBHOOK_EVENTS = [
   { value: 'automation.activated', label: 'Automação Ativada' },
   { value: 'automation.paused', label: 'Automação Pausada' },
   { value: 'message.sent', label: 'Mensagem Enviada' },
   { value: 'message.delivered', label: 'Mensagem Entregue' },
   { value: 'message.failed', label: 'Mensagem Falhou' },
   { value: 'contact.created', label: 'Contato Criado' },
   { value: 'contact.updated', label: 'Contato Atualizado' },
 ] as const;
 
 interface WebhookFormProps {
   webhook?: Webhook;
   onSuccess?: () => void;
 }
 
 export function WebhookForm({ webhook, onSuccess }: WebhookFormProps) {
  const { data: existingConditions } = useWebhookConditions(webhook?.id);
  const saveConditions = useSaveWebhookConditions();
  const [conditionsDraft, setConditionsDraft] = useState<WebhookCondition[]>([]);
  const [conditionsInitialized, setConditionsInitialized] = useState(false);

  if (!conditionsInitialized && webhook?.id && existingConditions) {
    setConditionsDraft(existingConditions);
    setConditionsInitialized(true);
  }
   const createMutation = useCreateWebhook();
   const updateMutation = useUpdateWebhook();
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);
  const { validateUrl } = useWebhookValidation();

  const { data: secretStatus, refetch: refetchSecretStatus } = useWebhookSecretStatus(webhook?.id);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
 
   const form = useForm<WebhookFormData>({
     resolver: zodResolver(webhookSchema),
     defaultValues: webhook ? {
       name: webhook.name,
       url: webhook.url,
       events: webhook.events,
       headers: webhook.headers,
       is_active: webhook.is_active,
        retry_config: webhook.retry_config,
        enable_conditions: (webhook as any).enable_conditions ?? false,
        enable_transformation: (webhook as any).enable_transformation ?? false,
        transformation_script: (webhook as any).transformation_script ?? ''
     } : {
       name: '',
       url: '',
       events: [],
       headers: {},
       is_active: true,
        retry_config: { max_attempts: 3, backoff_multiplier: 2 },
        enable_conditions: false,
        enable_transformation: false,
        transformation_script: ''
     }
   });
 
    const onSubmit = async (data: WebhookFormData) => {
    // SSRF Protection: Validate URL before submitting
    setIsValidatingUrl(true);
    setUrlValidationError(null);

    try {
      const validationResult = await validateUrl.mutateAsync(data.url);

      if (!validationResult?.valid) {
        const errorMsg = validationResult?.error || 'URL inválida para webhook';
        setUrlValidationError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // URL is valid, proceed with creation/update
      setUrlValidationError(null);
    } catch {
      toast.error('Erro ao validar URL');
      return;
    } finally {
      setIsValidatingUrl(false);
    }

    const retryConfig = {
      max_attempts: data.retry_config?.max_attempts ?? 3,
      backoff_multiplier: data.retry_config?.backoff_multiplier ?? 2
    };

      if (webhook) {
      await updateMutation.mutateAsync({ 
        id: webhook.id, 
        updates: {
          name: data.name,
          url: data.url,
          events: data.events,
          headers: data.headers || {},
          is_active: data.is_active,
          retry_config: retryConfig,
          enable_conditions: data.enable_conditions,
          enable_transformation: data.enable_transformation,
          transformation_script: (data.transformation_script || '').trim() || null,
        }
      });

      if (data.enable_conditions) {
        await saveConditions.mutateAsync({
          webhookId: webhook.id,
          conditions: (conditionsDraft ?? []).map((c, idx) => ({ ...c, webhookId: webhook.id, position: idx })),
        });
      } else {
        await saveConditions.mutateAsync({ webhookId: webhook.id, conditions: [] });
      }
     } else {
       const created = await createMutation.mutateAsync({
        name: data.name,
        url: data.url,
        events: data.events,
        headers: data.headers || {},
        is_active: data.is_active,
        retry_config: retryConfig,
        enable_conditions: data.enable_conditions,
        enable_transformation: data.enable_transformation,
        transformation_script: (data.transformation_script || '').trim() || null,
      });

       // Create secret on vault and show once
       const { data: secretResp, error: secretErr } = await supabase.functions.invoke('webhook-secret', {
         body: { action: 'create_if_missing', webhook_id: created.id },
       });
       if (!secretErr && secretResp?.secret) {
         setRevealedSecret(String(secretResp.secret));
       }
     }
     onSuccess?.();
   };

    const secretLabel = useMemo(() => {
      if (!secretStatus?.configured) return 'Secret não configurado';
      if (secretStatus.last4) return `Secret ••••${secretStatus.last4}`;
      return 'Secret configurado';
    }, [secretStatus]);

    const handleCreateIfMissing = async () => {
      if (!webhook?.id) return;
      const { data, error } = await supabase.functions.invoke('webhook-secret', {
        body: { action: 'create_if_missing', webhook_id: webhook.id },
      });
      if (error) {
        toast.error('Erro ao gerar secret');
        return;
      }
      if (data?.secret) {
        setRevealedSecret(String(data.secret));
        void refetchSecretStatus();
        toast.success('Secret gerado (mostrado 1x)');
      } else {
        toast.message('Secret já existe — não pode ser exibido novamente');
      }
    };

    const handleClaimLatest = async () => {
      if (!webhook?.id) return;
      const { data, error } = await supabase.functions.invoke('webhook-secret', {
        body: { action: 'claim_latest', webhook_id: webhook.id },
      });
      if (error) {
        toast.error('Erro ao revelar secret');
        return;
      }
      if (data?.secret) {
        setRevealedSecret(String(data.secret));
        void refetchSecretStatus();
        toast.success('Secret revelado (1x)');
      } else {
        toast.message('Este secret já foi revelado anteriormente');
      }
    };
 
   return (
     <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Secret do Webhook</p>
              <p className="text-sm text-muted-foreground">
                {secretLabel}. O secret é criptografado e só pode ser exibido uma única vez.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!webhook?.id ? (
                <p className="text-sm text-muted-foreground">Crie o webhook para gerar o secret.</p>
              ) : !secretStatus?.configured ? (
                <Button type="button" variant="outline" onClick={handleCreateIfMissing}>
                  Gerar secret
                </Button>
              ) : secretStatus?.claimed_at ? (
                <p className="text-sm text-muted-foreground">Já exibido 1x. Guarde em um local seguro.</p>
              ) : (
                <Button type="button" variant="outline" onClick={handleClaimLatest}>
                  Revelar secret (1x)
                </Button>
              )}
            </div>

            {revealedSecret ? (
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Secret (copie agora)</p>
                    <p className="mt-1 font-mono text-sm break-all">{revealedSecret}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enviado em <code>X-Webhook-Secret</code> (e durante o grace também em <code>X-Webhook-Secret-Previous</code>).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(revealedSecret);
                        toast.success('Copiado');
                      } catch {
                        toast.error('Não foi possível copiar');
                      }
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
         <FormField
           control={form.control}
           name="name"
           render={({ field }) => (
             <FormItem>
               <FormLabel>Nome</FormLabel>
               <FormControl>
                 <Input placeholder="Webhook de produção" {...field} />
               </FormControl>
               <FormDescription>
                 Nome identificador do webhook
               </FormDescription>
               <FormMessage />
             </FormItem>
           )}
         />
 
         <FormField
           control={form.control}
           name="url"
           render={({ field }) => (
             <FormItem>
               <FormLabel>URL (HTTPS)</FormLabel>
               <FormControl>
                 <Input 
                   type="url" 
                   placeholder="https://api.example.com/webhook" 
                    {...field}
                     onBlur={async (e) => {
                       field.onBlur();
                       const nextUrl = e.target.value;
                       if (!nextUrl) return;

                       setIsValidatingUrl(true);
                       setUrlValidationError(null);
                       try {
                         const res = await validateUrl.mutateAsync(nextUrl);
                         if (!res.valid) {
                           const msg = res.error || 'URL inválida para webhook';
                           setUrlValidationError(msg);
                         }
                       } finally {
                         setIsValidatingUrl(false);
                       }
                     }}
                    disabled={isValidatingUrl}
                 />
               </FormControl>
                <FormDescription className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Endpoint que receberá os eventos. Deve usar HTTPS. IPs privados e localhost são bloqueados por segurança.
                  </span>
               </FormDescription>
                {urlValidationError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{urlValidationError}</AlertDescription>
                  </Alert>
                )}
               <FormMessage />
             </FormItem>
           )}
         />
 
         <FormField
           control={form.control}
           name="events"
           render={() => (
             <FormItem>
               <FormLabel>Eventos</FormLabel>
               <FormDescription>
                 Selecione quais eventos devem disparar o webhook
               </FormDescription>
               <div className="grid grid-cols-2 gap-3 mt-2">
                 {WEBHOOK_EVENTS.map((event) => (
                   <FormField
                     key={event.value}
                     control={form.control}
                     name="events"
                     render={({ field }) => (
                       <FormItem className="flex items-center space-x-2 space-y-0">
                         <FormControl>
                           <Checkbox
                             checked={field.value?.includes(event.value)}
                             onCheckedChange={(checked) => {
                               return checked
                                 ? field.onChange([...(field.value || []), event.value])
                                 : field.onChange(
                                     field.value?.filter((v) => v !== event.value)
                                   );
                             }}
                           />
                         </FormControl>
                         <FormLabel className="text-sm font-normal cursor-pointer">
                           {event.label}
                         </FormLabel>
                       </FormItem>
                     )}
                   />
                 ))}
               </div>
               <FormMessage />
             </FormItem>
           )}
         />
 
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Webhook Ativo</FormLabel>
                  <FormDescription>Quando desativado, eventos não serão enviados</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enable_conditions"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Condições</FormLabel>
                    <FormDescription>
                      Filtre eventos (ex.: só enviar se <code>data.amount</code> &gt; 100)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </div>

                {field.value ? (
                  <div className="mt-4">
                    <ConditionBuilder
                      conditions={conditionsDraft}
                      onChange={(next) => {
                        const wid = webhook?.id ?? conditionsDraft[0]?.webhookId ?? "";
                        setConditionsDraft(next.map((c, i) => ({ ...c, webhookId: wid, position: i })));
                      }}
                    />
                  </div>
                ) : null}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enable_transformation"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Transformação de payload</FormLabel>
                    <FormDescription>
                      Transforme o payload com um template JSON seguro (placeholders <code>{"{{...}}"}</code>).
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </div>

                {field.value ? (
                  <div className="mt-4">
                    <PayloadTransformer
                      template={form.watch("transformation_script") || ""}
                      onChange={(t) => form.setValue("transformation_script", t, { shouldDirty: true })}
                    />
                  </div>
                ) : null}
              </FormItem>
            )}
          />
 
         <div className="flex justify-end gap-3">
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending || isValidatingUrl}
            >
              {isValidatingUrl ? 'Validando URL...' : webhook ? 'Atualizar' : 'Criar'} Webhook
           </Button>
         </div>
       </form>
     </Form>
   );
 }