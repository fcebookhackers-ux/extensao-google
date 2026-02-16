import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { AutomationVersion, VersionWithUser } from "@/types/versioning";

export function useAutomationVersions(automationId: string) {
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ["automation-versions", automationId],
    enabled: !!automationId,
    queryFn: async () => {
      // Não fazemos join em auth.users aqui (RLS / limitações). Mantemos dados brutos.
      const { data, error } = await supabase
        .from("automation_versions")
        .select("*")
        .eq("automation_id", automationId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return (data ?? []) as VersionWithUser[];
    },
  });

  const getVersion = async (versionId: string) => {
    const { data, error } = await supabase.from("automation_versions").select("*").eq("id", versionId).single();
    if (error) throw error;
    return data as AutomationVersion;
  };

  const createVersionMutation = useMutation({
    mutationFn: async ({ doc, changeSummary }: { doc: any; changeSummary?: string }) => {
      const { data, error } = await supabase.rpc("create_automation_version", {
        p_automation_id: automationId,
        p_doc: doc,
        p_change_summary: changeSummary ?? null,
      });
      if (error) throw error;
      return data as string; // version id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["automation-versions", automationId] });
      toast.success("Nova versão criada");
    },
    onError: (error) => {
      console.error("Error creating version:", error);
      toast.error("Erro ao criar versão");
    },
  });

  const publishVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase.rpc("publish_automation_version", {
        p_automation_id: automationId,
        p_version_id: versionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["automation-versions", automationId] });
      toast.success("Versão publicada com sucesso");
    },
    onError: (error) => {
      console.error("Error publishing version:", error);
      toast.error("Erro ao publicar versão");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (targetVersionId: string) => {
      const { data, error } = await supabase.rpc("rollback_automation_version", {
        p_automation_id: automationId,
        p_target_version_id: targetVersionId,
      });

      if (error) throw error;
      return data as string; // new version id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["automation-versions", automationId] });
      toast.success("Rollback realizado com sucesso");
    },
    onError: (error) => {
      console.error("Error rolling back:", error);
      toast.error("Erro ao fazer rollback");
    },
  });

  return {
    versions: versionsQuery.data ?? [],
    isLoading: versionsQuery.isLoading,
    error: versionsQuery.error,
    getVersion,
    createVersion: createVersionMutation.mutate,
    createVersionAsync: createVersionMutation.mutateAsync,
    publishVersion: publishVersionMutation.mutate,
    rollback: rollbackMutation.mutate,
    rollbackAsync: rollbackMutation.mutateAsync,
    isCreating: createVersionMutation.isPending,
    isPublishing: publishVersionMutation.isPending,
    isRollingBack: rollbackMutation.isPending,
  };
}

export function useCurrentVersion(automationId: string) {
  return useQuery({
    queryKey: ["automation-current-version", automationId],
    enabled: !!automationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_versions")
        .select("*")
        .eq("automation_id", automationId)
        .eq("is_current", true)
        .single();

      if (error) throw error;
      return data as AutomationVersion;
    },
  });
}
