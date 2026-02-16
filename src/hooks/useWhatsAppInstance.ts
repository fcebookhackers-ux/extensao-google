import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppInstance } from "@/types/whatsapp";
import { mapInstanceRow } from "@/types/whatsapp";

function getSupabaseInvokeErrorMessage(err: unknown) {
  // supabase-js lança FunctionsHttpError/FunctionsFetchError/FunctionsRelayError
  // Para 4xx/5xx, o detalhe costuma vir em `context` (body/status).
  const anyErr = err as any;
  const fromContext =
    anyErr?.context?.body?.error ??
    anyErr?.context?.body?.message ??
    anyErr?.context?.body ??
    null;

  const status = anyErr?.context?.status ?? anyErr?.status ?? null;

  if (typeof fromContext === "string" && fromContext.trim()) return fromContext;
  if (fromContext && typeof fromContext === "object") {
    try {
      return JSON.stringify(fromContext);
    } catch {
      // ignore
    }
  }

  const raw = err instanceof Error ? err.message : "";
  const msg = typeof raw === "string" ? raw.trim() : "";
  if (msg) return status ? `[${status}] ${msg}` : msg;

  return status ? `[${status}] Erro desconhecido` : "Erro desconhecido";
}

async function getSupabaseInvokeErrorMessageAsync(err: unknown): Promise<string> {
  const anyErr = err as any;
  const status = anyErr?.context?.status ?? anyErr?.status ?? null;
  const response = anyErr?.context;

  if (typeof Response !== "undefined" && response instanceof Response) {
    try {
      const text = await response.clone().text();
      if (text) {
        try {
          const body = JSON.parse(text);
          const msg = body?.error ?? body?.message;
          if (msg) return status ? `[${status}] ${msg}` : msg;
          return status ? `[${status}] ${text}` : text;
        } catch {
          return status ? `[${status}] ${text}` : text;
        }
      }
    } catch {
      // ignore and fall back
    }
  }

  return getSupabaseInvokeErrorMessage(err);
}

export function useWhatsAppInstance(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: instance,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["whatsapp-instance", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data ? (mapInstanceRow(data) as WhatsAppInstance) : null;
    },
    enabled: !!workspaceId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "qr_ready" || data?.status === "connecting") return 5000;
      if (data?.status === "connected") return 30000;
      return false;
    },
  });

  const createInstance = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("evolution-create-instance", {
        body: { workspaceId },
      });
      if (error) {
        const message = await getSupabaseInvokeErrorMessageAsync(error);
        throw new Error(message);
      }
      return mapInstanceRow(data) as WhatsAppInstance;
    },
    onSuccess: () => {
      toast({
        title: "Instância criada",
        description: "Escaneie o QR Code para conectar",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instance"] });
    },
    onError: (err: unknown) => {
      // Importante para debug: ver o shape real do erro (FunctionsHttpError etc.)
      console.error("evolution-create-instance invoke error", err);
      const message = err instanceof Error ? err.message : getSupabaseInvokeErrorMessage(err);
      toast({
        title: "Erro ao criar instância",
        description: message,
        variant: "destructive",
      });
    },
  });

  const disconnectInstance = useMutation({
    mutationFn: async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke("evolution-disconnect-instance", {
        body: { instanceId },
      });
      if (error) {
        const message = await getSupabaseInvokeErrorMessageAsync(error);
        throw new Error(message);
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "WhatsApp desconectado",
        description: "Sua conta foi desconectada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instance"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : getSupabaseInvokeErrorMessage(err);
      toast({
        title: "Erro ao desconectar",
        description: message,
        variant: "destructive",
      });
    },
  });

  const resetInstance = useMutation({
    mutationFn: async (instanceId: string) => {
      if (!workspaceId) throw new Error("workspaceId ausente");

      const { error: discErr } = await supabase.functions.invoke("evolution-disconnect-instance", {
        body: { instanceId },
      });
      if (discErr) {
        const message = await getSupabaseInvokeErrorMessageAsync(discErr);
        throw new Error(message);
      }

      const { data: created, error: createErr } = await supabase.functions.invoke("evolution-create-instance", {
        body: { workspaceId },
      });
      if (createErr) {
        const message = await getSupabaseInvokeErrorMessageAsync(createErr);
        throw new Error(message);
      }

      return mapInstanceRow(created) as WhatsAppInstance;
    },
    onSuccess: () => {
      toast({
        title: "Instância reconfigurada",
        description: "Um novo QR Code foi gerado para este workspace.",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instance"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : getSupabaseInvokeErrorMessage(err);
      toast({
        title: "Erro ao reconfigurar",
        description: message,
        variant: "destructive",
      });
    },
  });

  return {
    instance,
    isLoading,
    error,
    refetch,
    createInstance,
    disconnectInstance,
    resetInstance,
  };
}
