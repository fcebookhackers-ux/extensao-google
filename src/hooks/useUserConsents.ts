import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { UserConsentRecord, UserConsentState, UserConsentType } from "@/types/consents";

const CONSENT_TYPES: Array<Exclude<UserConsentType, "essential">> = ["analytics", "marketing", "third_party"];

function computeCurrentState(rows: UserConsentRecord[]): UserConsentState {
  const state: UserConsentState = {
    essential: true,
    analytics: false,
    marketing: false,
    third_party: false,
  };

  for (const t of CONSENT_TYPES) {
    const latest = rows.find((r) => r.consent_type === t);
    state[t] = latest?.granted ?? false;
  }

  return state;
}

export function useUserConsents(options: { refetchIntervalMs?: number } = {}) {
  const queryClient = useQueryClient();

  const consentsQuery = useQuery({
    queryKey: ["user-consents"],
    refetchInterval: options.refetchIntervalMs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_consents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UserConsentRecord[];
    },
  });

  const updateConsent = useMutation({
    mutationFn: async ({ type, granted }: { type: Exclude<UserConsentType, "essential">; granted: boolean }) => {
      const { data, error } = await supabase.rpc("update_user_consent", {
        p_consent_type: type,
        p_granted: granted,
        p_metadata: {},
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-consents"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar consentimento"),
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("revoke_all_consents");
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-consents"] });
      toast.success("Todos os consentimentos (exceto Essential) foram revogados");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao revogar consentimentos"),
  });

  const rows = consentsQuery.data ?? [];
  const current = computeCurrentState(rows);

  return {
    consents: rows,
    current,
    isLoading: consentsQuery.isLoading,
    updateConsent: updateConsent.mutate,
    isUpdating: updateConsent.isPending,
    revokeAll: revokeAll.mutate,
    isRevokingAll: revokeAll.isPending,
  };
}
