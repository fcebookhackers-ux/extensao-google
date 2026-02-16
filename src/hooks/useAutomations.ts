import { useQuery } from "@tanstack/react-query";
import { trace } from "@opentelemetry/api";

import { supabase } from "@/integrations/supabase/client";

const tracer = trace.getTracer("zapfllow-automations");

export type AutomationListItem = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused";
  created_at: string;
  updated_at: string;
};

export function useAutomations() {
  return useQuery({
    queryKey: ["automations"],
    queryFn: async (): Promise<AutomationListItem[]> => {
      const span = tracer.startSpan("fetch_automations");
      try {
        const workspaceId =
          typeof localStorage !== "undefined" ? localStorage.getItem("selected-workspace-id") : null;

        if (workspaceId) span.setAttribute("app.workspace_id", workspaceId);

        const { data, error } = await supabase
          .from("automations")
          .select("id,name,status,created_at,updated_at")
          .order("updated_at", { ascending: false });

        if (error) throw error;
        span.setAttribute("automation.count", (data ?? []).length);
        return (data ?? []) as AutomationListItem[];
      } catch (error) {
        span.recordException(error as any);
        throw error;
      } finally {
        span.end();
      }
    },
    staleTime: 30_000,
  });
}
