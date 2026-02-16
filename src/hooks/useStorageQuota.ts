import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StorageQuota, QuotaUsage } from '@/types/storage-quota';

type StorageStatsByUser = {
  used_bytes: number;
  max_bytes: number;
  used_percentage: number;
  file_count: number;
  max_file_count: number;
};

export function useStorageStatsByUser() {
  return useQuery({
    queryKey: ["storage-stats-by-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Você precisa estar autenticado para visualizar sua quota de armazenamento");
      }

      const { data, error } = await supabase.rpc("get_storage_stats_by_user");
      if (error) throw error;

      const raw = (data ?? {}) as Partial<StorageStatsByUser>;
      return {
        usedBytes: Number(raw.used_bytes ?? 0),
        maxBytes: Number(raw.max_bytes ?? 0),
        usedPercentage: Number(raw.used_percentage ?? 0),
        fileCount: Number(raw.file_count ?? 0),
        maxFileCount: Number(raw.max_file_count ?? 0),
      };
    },
    staleTime: 30_000,
  });
}

export function useStorageQuota() {
  return useQuery({
    queryKey: ['storage-quota'],
    queryFn: async () => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para visualizar sua quota de armazenamento');
      }

      const { data, error } = await supabase
        .from('user_storage_quotas')
        .select('*')
        .eq('user_id', user.id) // Explicit filter (RLS also enforces this)
        .single();

      if (error) throw error;
      return data as StorageQuota;
    },
    staleTime: 30000, // 30s cache
  });
}

export function useQuotaUsage(): QuotaUsage | null {
  const { data: quota } = useStorageQuota();

  if (!quota) return null;

  const used = quota.total_size_bytes;
  const max = quota.max_size_bytes;
  const percentage = max > 0 ? (used / max) * 100 : 0;
  const remaining = Math.max(max - used, 0);

  return {
    used,
    max,
    percentage,
    remaining,
  };
}

export function useCheckQuotaAvailable() {
  const { data: quota } = useStorageQuota();

  return (fileSize: number): { available: boolean; reason?: string } => {
    if (!quota) {
      return { available: false, reason: 'Quota não encontrada' };
    }

    // Check file count
    if (quota.file_count >= quota.max_file_count) {
      return {
        available: false,
        reason: `Limite de arquivos atingido (${quota.max_file_count} arquivos)`,
      };
    }

    // Check storage size
    const newTotal = quota.total_size_bytes + fileSize;
    if (newTotal > quota.max_size_bytes) {
      const usedGB = (quota.total_size_bytes / (1024 ** 3)).toFixed(2);
      const maxGB = (quota.max_size_bytes / (1024 ** 3)).toFixed(2);
      return {
        available: false,
        reason: `Espaço insuficiente. Usando ${usedGB} GB de ${maxGB} GB.`,
      };
    }

    return { available: true };
  };
}
