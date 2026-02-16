import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QUERY_CACHE_STORAGE_KEY, tryDeserializePersistedClient, trySerializePersistedClient } from '@/lib/query-persist';
import { cacheStrategies, type CacheDomain } from '@/config/cache-strategy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatBytes } from '@/lib/format';

type DomainStats = {
  itemCount: number;
  size: number; // bytes
};

function useCacheStats() {
  const [stats, setStats] = useState<Record<string, DomainStats>>({});

  const compute = useCallback(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    if (!raw) {
      setStats({});
      return;
    }
    const parsed = tryDeserializePersistedClient(raw) as any;
    const queries: any[] = parsed?.clientState?.queries ?? [];
    const grouped: Record<string, any[]> = {};
    for (const q of queries) {
      const key0 = Array.isArray(q.queryKey) ? q.queryKey[0] : 'unknown';
      const domain = typeof key0 === 'string' ? key0 : 'unknown';
      (grouped[domain] ||= []).push(q);
    }
    const out: Record<string, DomainStats> = {};
    for (const [domain, list] of Object.entries(grouped)) {
      const json = JSON.stringify(list);
      out[domain] = { itemCount: list.length, size: new Blob([json]).size };
    }
    setStats(out);
  }, []);

  useEffect(() => {
    compute();
    const onStorage = (e: StorageEvent) => {
      if (e.key === QUERY_CACHE_STORAGE_KEY) compute();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [compute]);

  return stats;
}

export function OfflineCacheManager() {
  const stats = useCacheStats();
  const domains = useMemo(() => Object.keys(cacheStrategies) as CacheDomain[], []);

  const clearDomain = (domain: CacheDomain) => {
    const raw = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = tryDeserializePersistedClient(raw) as any;
    if (!parsed?.clientState?.queries) return;
    const queries: any[] = parsed.clientState.queries ?? [];
    const filtered = queries.filter((q) => {
      const key0 = Array.isArray(q.queryKey) ? q.queryKey[0] : undefined;
      return key0 !== domain;
    });
    const next = { ...parsed, clientState: { ...parsed.clientState, queries: filtered } };
    window.localStorage.setItem(QUERY_CACHE_STORAGE_KEY, trySerializePersistedClient(next));
  };

  const clearAll = () => {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Cache Offline</h3>
        <Button variant="secondary" size="sm" onClick={clearAll}>Limpar todo cache</Button>
      </div>
      <Separator className="my-3" />
      <div className="space-y-3">
        {domains.map((domain) => {
          const s = stats[domain] || { itemCount: 0, size: 0 };
          return (
            <div key={domain} className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium capitalize">{domain}</div>
                <div className="text-xs text-muted-foreground">{s.itemCount} itens · {formatBytes(s.size)}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => clearDomain(domain)}>Limpar</Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default OfflineCacheManager;
