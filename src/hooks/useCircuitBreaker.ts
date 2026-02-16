import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CircuitBreaker } from '@/types/circuit-breaker';

export function useCircuitBreakerStatus(webhookId: string | undefined) {
  return useQuery({
    queryKey: ['circuit-breaker', webhookId],
    queryFn: async () => {
      if (!webhookId) return null;

      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para visualizar circuit breakers');
      }

      const { data, error } = await supabase
        .from('webhook_circuit_breaker')
        .select('*')
        .eq('webhook_id', webhookId)
        .maybeSingle(); // Use maybeSingle to avoid error when no data

      if (error) throw error;
      return data as CircuitBreaker | null;
    },
    enabled: !!webhookId,
    refetchInterval: 30000, // Atualizar a cada 30s
  });
}

export function useAllCircuitBreakers() {
  return useQuery({
    queryKey: ['circuit-breakers'],
    queryFn: async () => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para visualizar circuit breakers');
      }

      const { data, error } = await supabase
        .from('webhook_circuit_breaker')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as CircuitBreaker[];
    },
    refetchInterval: 30000,
  });
}
