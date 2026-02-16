import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WebhookCondition } from "@/types/webhook-transformation";

function toRow(c: WebhookCondition) {
  return {
    id: c.id,
    webhook_id: c.webhookId,
    field_path: c.fieldPath,
    operator: c.operator,
    value: c.value ?? "",
    logic_operator: c.logicOperator,
    position: c.position,
  };
}

function fromRow(r: any): WebhookCondition {
  return {
    id: r.id,
    webhookId: r.webhook_id,
    fieldPath: r.field_path,
    operator: r.operator,
    value: r.value ?? "",
    logicOperator: r.logic_operator,
    position: r.position ?? 0,
    createdAt: r.created_at,
  };
}

export function useWebhookConditions(webhookId: string | undefined) {
  return useQuery({
    queryKey: ["webhook-conditions", webhookId],
    enabled: !!webhookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_conditions")
        .select("*")
        .eq("webhook_id", webhookId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(fromRow);
    },
  });
}

export function useSaveWebhookConditions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ webhookId, conditions }: { webhookId: string; conditions: WebhookCondition[] }) => {
      // Replace-all strategy (simple + ordered)
      const { error: delErr } = await supabase.from("webhook_conditions").delete().eq("webhook_id", webhookId);
      if (delErr) throw delErr;

      if (conditions.length) {
        const rows = conditions.map(toRow);
        const { error: insErr } = await supabase.from("webhook_conditions").insert(rows);
        if (insErr) throw insErr;
      }

      return true;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["webhook-conditions", vars.webhookId] });
      toast.success("Condições salvas");
    },
    onError: () => toast.error("Erro ao salvar condições"),
  });
}
