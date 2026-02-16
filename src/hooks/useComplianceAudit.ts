import { supabase } from "@/integrations/supabase/client";

export type ComplianceAuditInput = {
  action: string;
  workspaceId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export function useComplianceAudit() {
  const logComplianceEvent = async ({
    action,
    workspaceId,
    entityType,
    entityId,
    metadata,
  }: ComplianceAuditInput) => {
    try {
      const resolvedWorkspaceId =
        workspaceId ??
        (typeof localStorage !== "undefined" ? localStorage.getItem("selected-workspace-id") : null);

      await supabase.functions.invoke("log-audit-event", {
        body: {
          action,
          workspace_id: resolvedWorkspaceId,
          entity_type: entityType ?? null,
          entity_id: entityId ?? null,
          metadata: metadata ?? {},
        },
      });
    } catch (err) {
      // Nunca bloquear fluxo principal
      console.warn("Compliance audit log failed", err);
    }
  };

  return { logComplianceEvent };
}
