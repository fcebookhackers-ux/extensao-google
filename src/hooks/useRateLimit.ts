import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { checkRateLimit, enforceRateLimit, formatResetTime } from "@/lib/rate-limiter";
import type { RateLimitEndpoint } from "@/types/rate-limit";
import { RateLimitError } from "@/types/rate-limit";

export function useRateLimitCheck(endpoint: RateLimitEndpoint) {
  return useQuery({
    queryKey: ["rate-limit", endpoint],
    queryFn: () => checkRateLimit(endpoint),
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useRateLimitedAction<TData = any, TVariables = void>(
  endpoint: RateLimitEndpoint,
  action: (variables: TVariables) => Promise<TData>,
) {
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        await enforceRateLimit(endpoint);
        return await action(variables);
      } catch (error) {
        if (error instanceof RateLimitError) {
          const waitTime = formatResetTime(error.resetAt);
          toast.error(`Limite excedido. Aguarde ${waitTime}.`, { duration: 5000 });
        }
        throw error;
      }
    },
  });
}

export function useRateLimitStatus(endpoint: RateLimitEndpoint) {
  const { data, isLoading } = useRateLimitCheck(endpoint);
  const remaining = data?.remaining ?? 0;
  const allowed = data?.allowed ?? true;
  const resetAt = data?.reset_at ? new Date(data.reset_at) : null;

  // Sem o max_requests no payload, usamos uma escala visual conservadora.
  // (Se quiser precisão: ajustar RPC para retornar max_requests.)
  const percentageUsed = data
    ? Math.min(100, Math.max(0, 100 - Math.round((remaining / 100) * 100)))
    : 0;

  return {
    allowed,
    remaining,
    resetAt,
    isLoading,
    percentageUsed,
  };
}
