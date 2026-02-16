import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

// Single source of truth for the storage key
export const QUERY_CACHE_STORAGE_KEY = 'ZAPFLLOW_QUERY_CACHE';

export function tryDeserializePersistedClient(raw: string): PersistedClient | null {
  try {
    // First: try compressed
    const decompressed = decompressFromUTF16(raw);
    if (decompressed) return JSON.parse(decompressed);
  } catch {
    // ignore
  }

  try {
    // Fallback: plain JSON
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function trySerializePersistedClient(client: PersistedClient): string {
  const json = JSON.stringify(client);
  try {
    return compressToUTF16(json);
  } catch {
    return json;
  }
}

// Storage adapter with compression (UTF16 to be safe with localStorage)
export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: QUERY_CACHE_STORAGE_KEY,
  serialize: (client: PersistedClient) => trySerializePersistedClient(client),
  deserialize: (str: string) => {
    const parsed = tryDeserializePersistedClient(str);
    if (parsed) return parsed;

    // IMPORTANT: nunca lance aqui.
    // Se o localStorage estiver corrompido, um throw dentro do PersistQueryClientProvider
    // pode quebrar o app *antes* do ErrorBoundary e resultar em “tela branca”.
    try {
      window.localStorage?.removeItem(QUERY_CACHE_STORAGE_KEY);
    } catch {
      // ignore
    }

    // Retorna um estado vazio (válido) para o React Query Persist.
    return {
      timestamp: 0,
      buster: "",
      clientState: { queries: [], mutations: [] },
    } as PersistedClient;
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes fresh; allow working offline with persisted data
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24, // keep cached for 24h in memory
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      retry: 1,
    },
  },
});
