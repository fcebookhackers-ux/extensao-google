import { useQuery, type QueryFunction, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { cacheStrategies, type CacheDomain } from '@/config/cache-strategy';

function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out: Partial<T> = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out as Pick<T, K>;
}

export function usePersistedQuery<TData>(
  domain: CacheDomain,
  queryKey: QueryKey,
  queryFn: QueryFunction<TData>,
  options?: UseQueryOptions<TData>
) {
  const strategy = cacheStrategies[domain];

  return useQuery({
    queryKey,
    queryFn,
    ...options,
    staleTime: strategy.maxAge,
    gcTime: strategy.persist ? Infinity : strategy.maxAge,
    select: (data: any) => {
      if (strategy.fields === 'all') return data as TData;
      if (Array.isArray(data)) {
        return data.map((item) => pick(item, strategy.fields)) as unknown as TData;
      }
      return pick(data, strategy.fields) as unknown as TData;
    },
  });
}
