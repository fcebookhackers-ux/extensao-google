import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { supabase } from "@/integrations/supabase/client";

// Hook para prefetch de dados relacionados (automations, contatos, métricas e mensagens)
export function usePrefetchRelated() {
  const queryClient = useQueryClient();

  const prefetchAutomationDetails = useCallback(
    async (automationId: string) => {
      if (!automationId) return;

      await queryClient.prefetchQuery({
        queryKey: ["automation", automationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("automations")
            .select("*")
            .eq("id", automationId)
            .single();
          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
      });

      await queryClient.prefetchQuery({
        queryKey: ["automation-versions", automationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("automation_versions")
            .select("*")
            .eq("automation_id", automationId)
            .order("version_number", { ascending: false });
          if (error) throw error;
          return data;
        },
      });

      await queryClient.prefetchQuery({
        queryKey: ["automation-metrics", automationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("automation_metrics")
            .select("*")
            .eq("automation_id", automationId)
            .single();
          if (error) throw error;
          return data;
        },
      });
    },
    [queryClient],
  );

  const prefetchContactDetails = useCallback(
    async (contactId: string) => {
      if (!contactId) return;

      await queryClient.prefetchQuery({
        queryKey: ["contact", contactId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("contacts")
            .select("*")
            .eq("id", contactId)
            .single();
          if (error) throw error;
          return data;
        },
      });

      await queryClient.prefetchQuery({
        queryKey: ["contact-messages", contactId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("contact_id", contactId)
            .order("created_at", { ascending: false })
            .limit(50);
          if (error) throw error;
          return data;
        },
      });
    },
    [queryClient],
  );

  return {
    prefetchAutomationDetails,
    prefetchContactDetails,
  };
}

// Hook para prefetch em hover
export function usePrefetchOnHover() {
  const { prefetchAutomationDetails, prefetchContactDetails } = usePrefetchRelated();

  const handleAutomationHover = useCallback(
    (automationId: string) => {
      void prefetchAutomationDetails(automationId);
    },
    [prefetchAutomationDetails],
  );

  const handleContactHover = useCallback(
    (contactId: string) => {
      void prefetchContactDetails(contactId);
    },
    [prefetchContactDetails],
  );

  return {
    handleAutomationHover,
    handleContactHover,
  };
}
