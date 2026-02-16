import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { offlineQueue } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type QueryKey = readonly unknown[];

interface OfflineMutationOptions<TData = any> {
  table: string;
  queryKey: QueryKey;
  optimisticUpdate?: (old: any, newData: TData) => any;
}

function createOfflineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `offline_${Math.random().toString(16).slice(2)}`;
}

export function useOfflineCreate<TData = any>({ table, queryKey, optimisticUpdate }: OfflineMutationOptions<TData>) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TData) => {
      if (!isOnline) {
        offlineQueue.add({ type: "create", table, data });
        return { ...(data as any), id: createOfflineId(), _offline: true };
      }

      const { data: result, error } = await supabase.from(table as any).insert(data as any).select().single();
      if (error) throw error;
      return result;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      if (optimisticUpdate) {
        queryClient.setQueryData(queryKey, (old: any) => optimisticUpdate(old, newData as any));
      }

      return { previousData };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useOfflineUpdate<TData extends { id: string } = any>({
  table,
  queryKey,
  optimisticUpdate,
}: OfflineMutationOptions<TData>) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TData) => {
      if (!isOnline) {
        offlineQueue.add({ type: "update", table, data });
        return { ...(data as any), _offline: true };
      }

      const { data: result, error } = await supabase
        .from(table as any)
        .update(data as any)
        .eq("id", (data as any).id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      if (optimisticUpdate) {
        queryClient.setQueryData(queryKey, (old: any) => optimisticUpdate(old, newData as any));
      }

      return { previousData };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useOfflineDelete({ table, queryKey, optimisticUpdate }: OfflineMutationOptions<{ id: string }>) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!isOnline) {
        offlineQueue.add({ type: "delete", table, data: { id } });
        return { id, _offline: true };
      }

      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      if (optimisticUpdate) {
        queryClient.setQueryData(queryKey, (old: any) => optimisticUpdate(old, vars as any));
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
