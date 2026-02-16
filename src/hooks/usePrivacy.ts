import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { ConsentRecord, ConsentType, DataDeletionRequest, DataExportRequest } from "@/types/privacy";

type UsePrivacyOptions = {
  refetchIntervalMs?: number;
};

export function useDataExport(options: UsePrivacyOptions = {}) {
  const queryClient = useQueryClient();

  const exportsQuery = useQuery({
    queryKey: ["data-exports"],
    refetchInterval: options.refetchIntervalMs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_export_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as DataExportRequest[];
    },
  });

  const requestExportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_data_export");
      if (error) throw error;
      return data as string; // request id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["data-exports"] });
      toast.success("Exportação solicitada! Você receberá um email quando estiver pronta.", { duration: 5000 });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao solicitar exportação");
    },
  });

  return {
    exports: exportsQuery.data ?? [],
    isLoading: exportsQuery.isLoading,
    requestExport: requestExportMutation.mutate,
    isRequesting: requestExportMutation.isPending,
  };
}

export function useAccountDeletion(options: UsePrivacyOptions = {}) {
  const queryClient = useQueryClient();

  const deletionsQuery = useQuery({
    queryKey: ["account-deletions"],
    refetchInterval: options.refetchIntervalMs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_deletion_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as DataDeletionRequest[];
    },
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async (reason?: string) => {
      const { data, error } = await supabase.rpc("request_account_deletion", {
        p_reason: reason || null,
      });
      if (error) throw error;
      return data as string; // request id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-deletions"] });
      toast.success("Exclusão agendada para 30 dias. Você pode cancelar a qualquer momento.", { duration: 7000 });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao solicitar exclusão");
    },
  });

  const cancelDeletionMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("cancel_account_deletion", {
        p_request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-deletions"] });
      toast.success("Exclusão cancelada com sucesso");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao cancelar exclusão");
    },
  });

  const pendingDeletion = deletionsQuery.data?.find((d) => d.status === "scheduled");

  return {
    deletions: deletionsQuery.data ?? [],
    pendingDeletion,
    isLoading: deletionsQuery.isLoading,
    requestDeletion: requestDeletionMutation.mutate,
    cancelDeletion: cancelDeletionMutation.mutate,
    isRequesting: requestDeletionMutation.isPending,
    isCancelling: cancelDeletionMutation.isPending,
  };
}

export function useConsents(options: UsePrivacyOptions = {}) {
  const queryClient = useQueryClient();

  const consentsQuery = useQuery({
    queryKey: ["consent-history"],
    refetchInterval: options.refetchIntervalMs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consent_history")
        .select("*")
        .order("granted_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ConsentRecord[];
    },
  });

  const recordConsentMutation = useMutation({
    mutationFn: async ({
      type,
      version,
      granted,
    }: {
      type: ConsentType;
      version: string;
      granted: boolean;
    }) => {
      const { data, error } = await supabase.rpc("record_consent", {
        p_consent_type: type,
        p_policy_version: version,
        p_granted: granted,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["consent-history"] });
    },
  });

  return {
    consents: consentsQuery.data ?? [],
    isLoading: consentsQuery.isLoading,
    recordConsent: recordConsentMutation.mutate,
  };
}
