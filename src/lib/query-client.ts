import { QueryClient } from '@tanstack/react-query';

/**
 * Query Client com cache persistente no localStorage
 * 
 * Configurações:
 * - staleTime: 5min (dados considerados frescos por 5 minutos)
 * - cacheTime: 10min (dados mantidos em cache por 10 minutos após ficarem stale)
 * - Retry com exponential backoff
 * - Persistência no localStorage por até 24 horas
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache padrão de 5 minutos
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000, // Antiga "cacheTime" (renomeado no v5)
      
      // Retry com exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch apenas quando necessário
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1
    }
  }
});

// NOTA: Persistência de cache via localStorage comentada devido a incompatibilidade
// de tipos entre @tanstack/react-query e @tanstack/query-sync-storage-persister.
// 
// A persistência será implementada via Service Worker (sw-advanced.js) que já
// fornece cache de 3 camadas (network-first, stale-while-revalidate, cache-first).
//
// Se necessário, pode-se usar sessionStorage manualmente:
// const cachedData = sessionStorage.getItem('ZAPFLLOW_QUERY_CACHE');