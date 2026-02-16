import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SendMessagePayload, WhatsAppMessage } from "@/types/whatsapp";
import { mapMessageRow } from "@/types/whatsapp";

export function useWhatsAppMessages(conversationId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["whatsapp-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data: conversation, error: convErr } = await supabase
        .from("whatsapp_conversations")
        .select("contact_id, whatsapp_instance_id")
        .eq("id", conversationId)
        .single();

      if (convErr) throw convErr;
      if (!conversation) return [];

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("whatsapp_instance_id", conversation.whatsapp_instance_id)
        .eq("contact_id", conversation.contact_id)
        .order("timestamp", { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data ?? []).map(mapMessageRow) as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      const { data, error } = await supabase.functions.invoke("evolution-send-message", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({
        title: "Erro ao enviar mensagem",
        description: message,
        variant: "destructive",
      });
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}
