import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppConversation } from "@/types/whatsapp";
import { mapConversationRow } from "@/types/whatsapp";

export function useWhatsAppConversations(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: conversations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["whatsapp-conversations", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(
          `
          *,
          contact:contacts(
            id,
            name,
            phone,
            profile_picture_url
          )
        `,
        )
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("last_message_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []).map(mapConversationRow) as WhatsAppConversation[];
    },
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc("mark_conversation_as_read", {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });

  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ status: "archived" })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    markAsRead,
    archiveConversation,
  };
}
