 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import type { Webhook, WebhookLog } from '@/types/webhooks';
 import { toast } from 'sonner';
 import { useRealtimeCache } from '@/hooks/useRealtimeCache';

function normalizeWebhook(row: any): Webhook {
  return {
    ...row,
    headers: (row?.headers ?? {}) as Record<string, string>,
    retry_config: {
      max_attempts: row?.retry_config?.max_attempts ?? 3,
      backoff_multiplier: row?.retry_config?.backoff_multiplier ?? 2,
    },
  } as Webhook;
}
 
 export function useWebhooks() {
   const query = useQuery({
     queryKey: ['webhooks'],
     queryFn: async () => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para visualizar webhooks');
      }

       const { data, error } = await supabase
         .from('webhooks')
         .select('*')
        .eq('user_id', user.id) // Explicit filter (RLS also enforces this)
         .order('created_at', { ascending: false });
 
      if (error) throw error;
      return (data ?? []).map(normalizeWebhook);
     }
   });

   // Auto-sync com Supabase Realtime
   useRealtimeCache({
     table: 'webhooks',
     queryKey: ['webhooks']
   });

   return query;
 }
 
 export function useCreateWebhook() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (webhook: Omit<Webhook, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      // Security: Verify user is authenticated
       const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para criar webhooks');
      }

       const { data, error } = await supabase
         .from('webhooks')
         .insert([{
           ...webhook,
          user_id: user.id, // CRITICAL: Must match auth.uid() for RLS
         }])
         .select()
         .single();
 
      if (error) throw error;
      return normalizeWebhook(data);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['webhooks'] });
       toast.success('Webhook criado com sucesso');
     },
     onError: () => {
       toast.error('Erro ao criar webhook');
     }
   });
 }
 
 export function useUpdateWebhook() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, updates }: { id: string; updates: Partial<Webhook> }) => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para atualizar webhooks');
      }

       const { data, error } = await supabase
         .from('webhooks')
         .update(updates)
         .eq('id', id)
        .eq('user_id', user.id) // Explicit check (RLS also enforces this)
         .select()
         .single();
 
      if (error) throw error;
      return normalizeWebhook(data);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['webhooks'] });
       toast.success('Webhook atualizado');
     },
     onError: () => {
       toast.error('Erro ao atualizar webhook');
     }
   });
 }
 
 export function useDeleteWebhook() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para excluir webhooks');
      }

       const { error } = await supabase
         .from('webhooks')
         .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Explicit check (RLS also enforces this)
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['webhooks'] });
       toast.success('Webhook excluído');
     },
     onError: () => {
       toast.error('Erro ao excluir webhook');
     }
   });
 }
 
 export function useWebhookLogs(webhookId: string) {
   return useQuery({
     queryKey: ['webhook-logs', webhookId],
     queryFn: async () => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para visualizar logs de webhooks');
      }

       const { data, error } = await supabase
         .from('webhook_logs')
         .select('*')
         .eq('webhook_id', webhookId)
         .order('executed_at', { ascending: false })
         .limit(100);
 
       if (error) throw error;
       return data as WebhookLog[];
     },
     enabled: !!webhookId
   });
 }
 
 export function useTestWebhook() {
   return useMutation({
     mutationFn: async (webhookId: string) => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para testar webhooks');
      }

       const { data, error } = await supabase.rpc('trigger_webhook', {
         p_webhook_id: webhookId,
         p_event_type: 'test.webhook',
         p_payload: {
           test: true,
           timestamp: new Date().toISOString()
         }
       });
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       toast.success('Webhook de teste enviado');
     },
     onError: () => {
       toast.error('Erro ao testar webhook');
     }
   });
 }