import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WebhookFromTemplate, WebhookProvider, WebhookTemplate } from "@/types/webhook-templates";

function matchesProviderUrl(provider: WebhookProvider, url: string) {
  const u = url.trim();
  if (!u.startsWith("https://")) return false;

  switch (provider) {
    case "discord":
      return /^https:\/\/discord\.com\/api\/webhooks\//i.test(u);
    case "slack":
      return /^https:\/\/hooks\.slack\.com\/services\//i.test(u);
    case "zapier":
      return /^https:\/\/hooks\.zapier\.com\/hooks\/catch\//i.test(u);
    case "make":
      return /^https:\/\/hook\.[a-z0-9-]+\.make\.com\//i.test(u) || /^https:\/\/hook\.[a-z0-9-]+\.integromat\.com\//i.test(u);
    case "webhook_site":
      return /^https:\/\/webhook\.site\//i.test(u);
    default:
      return true;
  }
}

function generateSecretHex(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useWebhookTemplates() {
  return useQuery({
    queryKey: ["webhook-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_templates")
        .select("*")
        .eq("is_active", true)
        .order("provider", { ascending: true });

      if (error) throw error;
      return (data ?? []) as WebhookTemplate[];
    },
  });
}

export function useCreateWebhookFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: WebhookFromTemplate) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Você precisa estar autenticado para criar webhooks");

      const { data: template, error: templateError } = await supabase
        .from("webhook_templates")
        .select("*")
        .eq("id", params.templateId)
        .eq("is_active", true)
        .single();

      if (templateError || !template) throw new Error("Template não encontrado");

      if (!matchesProviderUrl((template as any).provider, params.url)) {
        throw new Error("URL não parece válida para este provedor (use o formato recomendado)");
      }

      // SSRF Protection: validate URL via edge function
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        "validate-webhook-url",
        { body: { url: params.url } },
      );

      if (validationError) throw new Error("Erro ao validar URL do webhook");
      if (!validationResult?.valid) throw new Error(validationResult?.error || "URL inválida para webhook");

      const secret = generateSecretHex(32);

      const defaultEvents = ((template as any).default_events ?? []) as string[];
      const defaultHeaders = ((template as any).default_headers ?? {}) as Record<string, string>;

      const { data: webhook, error: webhookError } = await supabase
        .from("webhooks")
        .insert({
          user_id: auth.user.id,
          name: params.name?.trim() || (template as any).name,
          url: params.url.trim(),
          events: params.events?.length ? params.events : defaultEvents,
          headers: params.headers ?? defaultHeaders,
          secret,
          is_active: true,
          template_id: (template as any).id,
          template_provider: (template as any).provider,
          payload_template: params.customPayloadTemplate ?? (template as any).payload_template,
          metadata: {
            created_from_template: (template as any).id,
            template_provider: (template as any).provider,
          },
        })
        .select("*")
        .single();

      if (webhookError) throw webhookError;
      return webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook criado com template");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao criar webhook com template");
    },
  });
}
