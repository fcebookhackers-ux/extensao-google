import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { funnels, type FunnelId } from "@/components/analytics/conversion-funnels";

export type FunnelStepMetric = {
  step: string;
  name: string;
  users: number;
};

export function useConversionFunnel(funnelId: FunnelId, workspaceId?: string | null) {
  return useQuery({
    queryKey: ["conversion-funnel", funnelId, workspaceId ?? null],
    queryFn: async (): Promise<FunnelStepMetric[]> => {
      const resolvedWorkspaceId = workspaceId ?? localStorage.getItem("selected-workspace-id");
      if (!resolvedWorkspaceId) return [];

      const funnel = funnels[funnelId];
      const steps = funnel.map((s) => s.step);

      const { data, error } = await supabase.rpc("get_funnel_step_counts", {
        p_workspace_id: resolvedWorkspaceId,
        p_steps: steps,
      });

      if (error) throw error;

      const byStep = new Map<string, number>((data ?? []).map((r: any) => [String(r.step), Number(r.users ?? 0)]));
      return funnel.map((s) => ({ step: s.step, name: s.name, users: byStep.get(s.step) ?? 0 }));
    },
    staleTime: 60_000,
  });
}
