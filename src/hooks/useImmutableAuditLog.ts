import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ImmutableAuditLogRow = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ImmutableAuditLogFilters = {
  userId?: string;
  action?: string;
  from?: string; // ISO
  to?: string; // ISO
  limit?: number;
};

export function useImmutableAuditLog(filters: ImmutableAuditLogFilters) {
  return useQuery({
    queryKey: ["immutable-audit-log", filters],
    queryFn: async (): Promise<ImmutableAuditLogRow[]> => {
      let q = supabase
        .from("immutable_audit_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.userId) q = q.eq("user_id", filters.userId);
      if (filters.action) q = q.ilike("action", `%${filters.action}%`);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);

      q = q.limit(filters.limit ?? 200);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ImmutableAuditLogRow[];
    },
  });
}
