import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { AuditAction, AuditEvent, EntityType } from "@/types/audit";

type LogEventInput = {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  metadata?: Json;
  userAgent?: string;
  sessionId?: string;
};

export function useAudit() {
  const logEvent = async ({ action, entityType, entityId, metadata, userAgent, sessionId }: LogEventInput) => {
    try {
      const { error } = await supabase.rpc("log_audit_event", {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId ?? null,
        p_metadata: (metadata ?? {}) as Json,
        p_user_agent: userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : null),
        p_session_id: sessionId ?? null,
      });

      if (error) {
        // Auditoria nunca deve bloquear a operação principal
        console.error("Audit log failed:", error);
      }
    } catch (error) {
      console.error("Audit log error:", error);
    }
  };

  return { logEvent };
}

export function useAuditEvents(filters?: {
  action?: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["audit-events", filters ?? null],
    queryFn: async (): Promise<AuditEvent[]> => {
      let query = supabase
        .from("audit_events")
        // NOTE: audit_events ainda não existe no types.ts (gerado). Mantemos tipagem no retorno.
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.action) query = query.eq("action", filters.action);
      if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
      if (filters?.entityId) query = query.eq("entity_id", filters.entityId);

      query = query.limit(filters?.limit ?? 50);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as unknown as AuditEvent[];
    },
  });
}
