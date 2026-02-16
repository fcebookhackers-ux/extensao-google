import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ONBOARDING_STEPS_CONFIG } from "@/config/onboarding";
import type { OnboardingProgress, OnboardingStep, OnboardingStepId } from "@/types/onboarding";
import { useAuth } from "@/providers/AuthProvider";

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ["onboarding-progress", user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<OnboardingProgress> => {
      const { data, error } = await supabase.rpc("get_my_onboarding_status");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : (data as any);

      return {
        whatsapp_connected: Boolean(row?.whatsapp_connected),
        contacts_imported: Boolean(row?.contacts_imported),
        automation_created: Boolean(row?.automation_created),
        automation_activated: Boolean(row?.automation_activated),
        completed_at: (row?.completed_at as string | null) ?? null,
      };
    },
    staleTime: 30_000,
  });

  const completeStepMutation = useMutation({
    mutationFn: async (input: { stepId: OnboardingStepId; metadata?: Json }) => {
      const { data, error } = await supabase.rpc("complete_onboarding_step", {
        p_step_id: input.stepId,
        p_metadata: (input.metadata ?? {}) as Json,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
    },
  });

  const steps: OnboardingStep[] = React.useMemo(() => {
    const p = progressQuery.data;
    return [...ONBOARDING_STEPS_CONFIG]
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        ...s,
        completed: p ? Boolean((p as any)[s.id]) : false,
      }));
  }, [progressQuery.data]);

  const completedSteps = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const completionRate = totalSteps > 0 ? completedSteps / totalSteps : 0;
  const nextStep = steps.find((s) => !s.completed);
  const isCompleted = completionRate === 1;

  React.useEffect(() => {
    const p = progressQuery.data;
    if (!p) return;
    if (!isCompleted) return;
    if (p.completed_at) return;
    // Auto marca o onboarding como completo
    completeStepMutation.mutate({ stepId: "onboarding_completed" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted, progressQuery.data?.completed_at]);

  const completeStep = React.useCallback(
    (stepId: OnboardingStepId, metadata?: Json) => {
      completeStepMutation.mutate({ stepId, metadata });
    },
    [completeStepMutation],
  );

  return {
    steps,
    progress: progressQuery.data,
    completionRate,
    completedSteps,
    totalSteps,
    nextStep,
    isCompleted,
    isLoading: progressQuery.isLoading,
    completeStep,
  };
}
