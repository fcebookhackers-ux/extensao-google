import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type WebhookUrlValidationResult = {
  valid: boolean;
  error?: string;
};

export function useWebhookValidation() {
  const validateUrl = useMutation({
    mutationFn: async (url: string): Promise<WebhookUrlValidationResult> => {
      const { data, error } = await supabase.functions.invoke("validate-webhook-url", {
        body: { url },
      });

      if (error) throw new Error(error.message);
      return (data ?? { valid: false, error: "Falha ao validar URL" }) as WebhookUrlValidationResult;
    },
    onError: (error: Error) => {
      toast.error("Erro ao validar URL", { description: error.message });
    },
  });

  return { validateUrl };
}
