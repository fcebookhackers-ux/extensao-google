import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { AlertConfigRow, AlertHistoryRow, AlertType } from "@/types/alerts";

export function useAlertConfigs() {
  return useQuery({
    queryKey: ["alert-configs"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Você precisa estar autenticado");

      const { data, error } = await supabase
        .from("alert_configs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AlertConfigRow[];
    },
    staleTime: 15_000,
  });
}

export function useAlertHistory(limit = 50) {
  return useQuery({
    queryKey: ["alert-history", limit],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Você precisa estar autenticado");

      const { data, error } = await supabase
        .from("alert_history")
        .select("*")
        .order("triggered_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AlertHistoryRow[];
    },
    staleTime: 15_000,
  });
}

type UpsertAlertInput = {
  id?: string;
  name: string;
  alert_type: AlertType;
  conditions: Record<string, any>;
  channels: string[];
  enabled: boolean;
};

export function useUpsertAlertConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertAlertInput) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Você precisa estar autenticado");

      const payload = {
        user_id: auth.user.id,
        name: input.name,
        alert_type: input.alert_type,
        conditions: input.conditions,
        channels: input.channels,
        enabled: input.enabled,
      };

      if (input.id) {
        const { error } = await supabase.from("alert_configs").update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }

      const { data, error } = await supabase.from("alert_configs").insert(payload).select("id").single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-configs"] });
      toast.success("Alerta salvo");
    },
    onError: (err) => {
      toast.error((err as any)?.message ?? "Falha ao salvar alerta");
    },
  });
}

export function useToggleAlertConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("alert_configs").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-configs"] }),
  });
}

export function useDeleteAlertConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alert_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-configs"] });
      toast.success("Alerta removido");
    },
  });
}

export function useRunAlertsCheck() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-alerts", { body: {} });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      const triggered = Number((data as any)?.triggered ?? 0);
      toast.success(triggered > 0 ? `Alertas disparados: ${triggered}` : "Nenhum alerta disparado");
    },
    onError: (err) => toast.error((err as any)?.message ?? "Falha ao checar alertas"),
  });
}
