import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWorkspaceId } from "@/lib/telemetry";

type RetentionPolicyRow = {
  id: string;
  entity_type: string;
  retention_days: number;
  deletion_strategy: string;
  apply_to_workspace_id: string | null;
  is_global: boolean;
};

type CleanupLogRow = {
  id: string;
  entity_type: string;
  deleted_count: number;
  execution_time_ms: number | null;
  executed_at: string;
};

function labelEntityType(t: string) {
  switch (t) {
    case "data_exports":
      return "Exportações";
    case "webhook_logs":
      return "Logs de Webhook";
    case "rate_limit_events":
      return "Rate limit";
    case "audit_events":
      return "Auditoria";
    case "analytics_events":
      return "Analytics";
    default:
      return t;
  }
}

export function DataRetentionCard() {
  const workspaceId = React.useMemo(() => getCurrentWorkspaceId(), []);

  const policiesQuery = useQuery({
    queryKey: ["data-retention-policies", workspaceId],
    queryFn: async () => {
      // Prefer workspace policies, but always show globals too
      const { data, error } = await supabase
        .from("data_retention_policies")
        .select("id, entity_type, retention_days, deletion_strategy, apply_to_workspace_id, is_global")
        .or(`is_global.eq.true,apply_to_workspace_id.eq.${workspaceId ?? ""}`)
        .order("entity_type", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RetentionPolicyRow[];
    },
    staleTime: 60_000,
  });

  const logsQuery = useQuery({
    queryKey: ["cleanup-logs", workspaceId],
    queryFn: async () => {
      const q = supabase
        .from("cleanup_logs")
        .select("id, entity_type, deleted_count, execution_time_ms, executed_at")
        .order("executed_at", { ascending: false })
        .limit(10);

      const { data, error } = workspaceId ? await q.eq("workspace_id", workspaceId) : await q;
      if (error) throw error;
      return (data ?? []) as unknown as CleanupLogRow[];
    },
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retenção e limpeza automática</CardTitle>
        <CardDescription>
          Políticas globais/workspace e histórico recente de execução (LGPD)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Políticas ativas</div>
          {policiesQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : policiesQuery.isError ? (
            <div className="text-sm text-destructive">Falha ao carregar políticas.</div>
          ) : policiesQuery.data.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma política encontrada.</div>
          ) : (
            <div className="grid gap-2">
              {policiesQuery.data.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{labelEntityType(p.entity_type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.retention_days} dias • {p.deletion_strategy}
                    </div>
                  </div>
                  <Badge variant={p.is_global ? "secondary" : "outline"}>
                    {p.is_global ? "Global" : "Workspace"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Histórico de limpeza</div>
          {logsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : logsQuery.isError ? (
            <div className="text-sm text-destructive">Falha ao carregar histórico.</div>
          ) : logsQuery.data.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem execuções registradas ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Deletados</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{labelEntityType(l.entity_type)}</TableCell>
                    <TableCell className="text-right">{Number(l.deleted_count ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{l.execution_time_ms ? `${l.execution_time_ms}ms` : "-"}</TableCell>
                    <TableCell className="text-right">{new Date(l.executed_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
