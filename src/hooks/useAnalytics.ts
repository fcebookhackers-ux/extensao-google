import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AnalyticsEvent, AnalyticsEventType, AutomationMetrics, FunnelMetrics, PerformanceMetrics } from "@/types/analytics";
import { useUserConsents } from "@/hooks/useUserConsents";

type AutomationPerformanceByUser = {
  total_automations: number;
  active_automations: number;
  total_messages_sent: number;
  delivery_rate: number;
  read_rate: number;
  response_rate: number;
  error_rate: number;
};

export function useAnalytics() {
  const { current, isLoading } = useUserConsents();

  const trackEvent = async (
    eventType: AnalyticsEventType,
    properties?: Record<string, any>,
    automationId?: string,
    contactId?: string,
    sessionId?: string,
    workspaceId?: string,
  ) => {
    try {
      // LGPD: se o usuário não concedeu consentimento de analytics, não registramos eventos.
      // Enquanto carrega, assumimos falso para evitar envio indevido.
      if (isLoading || !current.analytics) return;

       const resolvedWorkspaceId = workspaceId ?? localStorage.getItem("selected-workspace-id");
       if (!resolvedWorkspaceId) return;

      await supabase.rpc("track_analytics_event", {
        p_event_type: eventType,
        p_properties: properties || {},
        p_session_id: sessionId || null,
        p_automation_id: automationId || null,
        p_contact_id: contactId || null,
        p_workspace_id: resolvedWorkspaceId,
      });
    } catch (error) {
      // Não bloqueia operação principal
      console.error("Analytics tracking error:", error);
    }
  };

  return { trackEvent };
}

export function useFunnelMetrics() {
  return useQuery({
    queryKey: ["funnel-metrics"],
    queryFn: async (): Promise<FunnelMetrics> => {
      const { data, error } = await supabase.from("user_funnel_metrics").select("*").single();
      if (error) throw error;
      return data as FunnelMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAutomationMetrics(automationId?: string) {
  return useQuery({
    queryKey: ["automation-metrics", automationId ?? null],
    queryFn: async (): Promise<AutomationMetrics | AutomationMetrics[]> => {
      if (automationId) {
        const { data, error } = await supabase
          .from("automation_metrics")
          .select("*")
          .eq("automation_id", automationId)
          .single();
        if (error) throw error;
        return data as AutomationMetrics;
      }

      const { data, error } = await supabase.from("automation_metrics").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as AutomationMetrics[];
    },
  });
}

export function usePerformanceMetrics(automationId: string): PerformanceMetrics {
  const { data } = useAutomationMetrics(automationId);

  if (!data || Array.isArray(data)) {
    return { deliveryRate: 0, readRate: 0, responseRate: 0, errorRate: 0 };
  }

  const sent = data.messages_sent || 0;
  return {
    deliveryRate: sent > 0 ? (data.messages_delivered / sent) * 100 : 0,
    readRate: sent > 0 ? (data.messages_read / sent) * 100 : 0,
    responseRate: sent > 0 ? (data.messages_replied / sent) * 100 : 0,
    errorRate: sent > 0 ? (data.messages_failed / sent) * 100 : 0,
  };
}

export function useAnalyticsEvents(filters?: {
  eventType?: AnalyticsEventType;
  automationId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["analytics-events", filters ?? null],
    queryFn: async (): Promise<AnalyticsEvent[]> => {
      let query = supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.eventType) query = query.eq("event_type", filters.eventType);
      if (filters?.automationId) query = query.eq("automation_id", filters.automationId);
      if (filters?.startDate) query = query.gte("created_at", filters.startDate.toISOString());
      if (filters?.endDate) query = query.lte("created_at", filters.endDate.toISOString());

      query = query.limit(filters?.limit ?? 100);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AnalyticsEvent[];
    },
  });
}

export function useAutomationPerformanceByUser() {
  return useQuery({
    queryKey: ["automation-performance-by-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("get_automation_performance_by_user");
      if (error) throw error;

      const raw = (data ?? {}) as Partial<AutomationPerformanceByUser>;
      return {
        totalAutomations: Number(raw.total_automations ?? 0),
        activeAutomations: Number(raw.active_automations ?? 0),
        totalMessagesSent: Number(raw.total_messages_sent ?? 0),
        deliveryRate: Number(raw.delivery_rate ?? 0),
        readRate: Number(raw.read_rate ?? 0),
        responseRate: Number(raw.response_rate ?? 0),
        errorRate: Number(raw.error_rate ?? 0),
      };
    },
    refetchInterval: 60_000,
  });
}
