import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Configuração do cache em tempo real
 */
interface RealtimeCacheConfig {
  /** Nome da tabela do Supabase para escutar */
  table: string;
  
  /** Query key do React Query para invalidar/atualizar */
  queryKey: readonly unknown[];
  
  /** Filtro PostgreSQL para aplicar (ex: "user_id=eq.{userId}") */
  filter?: string;
  
  /** Tipo de evento para escutar: INSERT, UPDATE, DELETE ou * (todos) */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  
  /** Se true, apenas invalida query ao invés de atualizar otimisticamente */
  invalidateOnly?: boolean;
}

/**
 * Hook para sincronizar cache do React Query com Supabase Realtime
 * 
 * Estratégias:
 * 1. Atualização otimista: Modifica cache imediatamente ao receber evento
 * 2. Invalidação debounced: Invalida query relacionada após 1s para refetch
 * 
 * @example
 * ```tsx
 * function WebhooksList() {
 *   const { data: webhooks } = useQuery({
 *     queryKey: ['webhooks'],
 *     queryFn: fetchWebhooks
 *   });
 *   
 *   // Auto-sync com realtime
 *   useRealtimeCache({
 *     table: 'webhooks',
 *     queryKey: ['webhooks']
 *   });
 *   
 *   return <div>{webhooks?.map(...)}</div>;
 * }
 * ```
 */
export function useRealtimeCache({
  table,
  queryKey,
  filter,
  event = '*',
  invalidateOnly = false
}: RealtimeCacheConfig) {
  
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Criar canal único baseado na config
    const channelName = `realtime:${table}:${queryKey.join(':')}:${filter || 'all'}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          console.log('[useRealtimeCache] Event received:', payload.eventType, table);
          
          if (invalidateOnly) {
            // Apenas invalidar query (refetch)
            queryClient.invalidateQueries({ 
              queryKey,
              exact: false 
            });
            return;
          }
          
          // Estratégia otimista de atualização
          queryClient.setQueryData(queryKey, (old: unknown) => {
            if (!old) return old;
            
            if (payload.eventType === 'INSERT') {
              // Adicionar novo item no início da lista
              if (Array.isArray(old)) {
                return [payload.new, ...old];
              }
              return old;
            }
            
            if (payload.eventType === 'UPDATE') {
              // Atualizar item existente
              if (Array.isArray(old)) {
                return old.map((item: any) => 
                  item.id === (payload.new as any).id ? payload.new : item
                );
              }
              // Se for um objeto único, substituir
              if (typeof old === 'object' && old !== null) {
                const oldItem = old as any;
                if (oldItem.id === (payload.new as any).id) {
                  return payload.new;
                }
              }
              return old;
            }
            
            if (payload.eventType === 'DELETE') {
              // Remover item
              if (Array.isArray(old)) {
                return old.filter((item: any) => item.id !== (payload.old as any).id);
              }
              // Se for um objeto único e foi deletado, retornar null
              if (typeof old === 'object' && old !== null) {
                const oldItem = old as any;
                if (oldItem.id === (payload.old as any).id) {
                  return null;
                }
              }
              return old;
            }
            
            return old;
          });
          
          // Invalidar queries relacionadas (debounced) para garantir consistência
          if (invalidateTimerRef.current) {
            clearTimeout(invalidateTimerRef.current);
          }
          
          invalidateTimerRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ 
              queryKey: [table],
              exact: false 
            });
          }, 1000);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useRealtimeCache] Subscribed to:', table);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[useRealtimeCache] Channel error:', table);
        }
      });
    
    return () => {
      console.log('[useRealtimeCache] Unsubscribing from:', table);
      
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
      }
      
      channelRef.current?.unsubscribe();
    };
  }, [table, queryKey, filter, event, invalidateOnly, queryClient]);
}

/**
 * Variante simplificada para uso comum (apenas invalidate)
 * 
 * @example
 * ```tsx
 * useRealtimeInvalidate('webhooks', ['webhooks']);
 * ```
 */
export function useRealtimeInvalidate(
  table: string,
  queryKey: readonly unknown[],
  filter?: string
) {
  return useRealtimeCache({
    table,
    queryKey,
    filter,
    invalidateOnly: true
  });
}