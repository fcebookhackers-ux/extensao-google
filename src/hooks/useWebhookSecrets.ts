import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WebhookSecretStatus = {
  configured: boolean;
  last4: string | null;
  expires_at: string | null;
  grace_expires_at: string | null;
  claimed_at: string | null;
};

export function useWebhookSecretStatus(webhookId?: string) {
  return useQuery({
    queryKey: ["webhook-secret-status", webhookId],
    enabled: Boolean(webhookId),
    queryFn: async (): Promise<WebhookSecretStatus> => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Você precisa estar autenticado");

      const { data, error } = await supabase
        .from("webhook_secrets")
        .select("secret_last4,expires_at,grace_expires_at,active,claimed_at")
        .eq("webhook_id", webhookId!)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          configured: false,
          last4: null,
          expires_at: null,
          grace_expires_at: null,
          claimed_at: null,
        };
      }

      return {
        configured: true,
        last4: data.secret_last4 ?? null,
        expires_at: data.expires_at ?? null,
        grace_expires_at: data.grace_expires_at ?? null,
        claimed_at: data.claimed_at ?? null,
      };
    },
    staleTime: 30_000,
  });
}
