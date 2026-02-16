import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { cacheStrategies, type CacheDomain } from '@/config/cache-strategy';
import { QUERY_CACHE_STORAGE_KEY, tryDeserializePersistedClient, trySerializePersistedClient } from '@/lib/query-persist';

type PersistedQuery = {
  queryKey: unknown[];
  state: {
    dataUpdatedAt?: number;
  };
};

export function cleanupOldCache() {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY);
  if (!raw) return;

  const client: PersistedClient | null = tryDeserializePersistedClient(raw);
  if (!client || !client.clientState) return;

  const queries = (client.clientState.queries as unknown as PersistedQuery[]) || [];
  const now = Date.now();

  // Filter by domain rules (domain is queryKey[0] when string)
  const filtered = queries.filter((q) => {
    const key0 = Array.isArray(q.queryKey) ? q.queryKey[0] : undefined;
    const domain = typeof key0 === 'string' ? (key0 as CacheDomain) : undefined;
    if (!domain || !(domain in cacheStrategies)) return true; // keep unknown
    const strategy = cacheStrategies[domain];
    if (!strategy.persist) return false; // do not persist -> drop
    const updatedAt = q.state?.dataUpdatedAt ?? 0;
    const age = now - updatedAt;
    return age < strategy.maxAge;
  });

  // Limit items per domain
  const byDomain = new Map<string, PersistedQuery[]>();
  for (const q of filtered) {
    const key0 = Array.isArray(q.queryKey) ? q.queryKey[0] : 'unknown';
    const list = byDomain.get(String(key0)) || [];
    list.push(q);
    byDomain.set(String(key0), list);
  }

  const limited: PersistedQuery[] = [];
  for (const [domain, list] of byDomain.entries()) {
    const strategy = (cacheStrategies as any)[domain] as (typeof cacheStrategies)[CacheDomain] | undefined;
    if (strategy && 'maxItems' in strategy && typeof (strategy as any).maxItems === 'number') {
      limited.push(...list.slice(0, (strategy as any).maxItems));
    } else {
      limited.push(...list);
    }
  }

  const newState: PersistedClient = {
    ...client,
    clientState: {
      ...client.clientState,
      queries: limited as any,
    },
  };

  try {
    window.localStorage.setItem(QUERY_CACHE_STORAGE_KEY, trySerializePersistedClient(newState));
  } catch (e) {
    console.warn('Failed to persist cleaned cache', e);
  }
}

let cleanupTimer: number | undefined;
export function startCleanupScheduler() {
  if (typeof window === 'undefined') return;
  cleanupOldCache();
  if (cleanupTimer) window.clearInterval(cleanupTimer);
  cleanupTimer = window.setInterval(() => cleanupOldCache(), 1000 * 60 * 60 * 24);
}
