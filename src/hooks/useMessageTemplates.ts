import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MessageTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  body: string;
  variables: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

export function useMessageTemplates() {
  return useQuery({
    queryKey: ["message-templates"],
    queryFn: async (): Promise<MessageTemplateRow[]> => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, name, description, body, variables, status, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MessageTemplateRow[];
    },
  });
}

export function useCreateMessageTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; body: string; variables: string[] }) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Sessão inválida");

      const { data, error } = await supabase
        .from("message_templates")
        .insert({
          user_id: userId,
          workspace_id: null,
          name: payload.name,
          description: payload.description?.trim() || null,
          body: payload.body,
          variables: payload.variables,
          status: "draft",
        })
        .select("id, name, description, body, variables, status, created_at, updated_at")
        .single();

      if (error) throw error;
      return data as unknown as MessageTemplateRow;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["message-templates"] });
    },
  });
}

export function useDeleteMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["message-templates"] });
    },
  });
}
