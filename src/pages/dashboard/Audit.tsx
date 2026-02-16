import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ShieldAlert } from "lucide-react";

import { useRole } from "@/hooks/useRole";
import { useImmutableAuditLog } from "@/hooks/useImmutableAuditLog";
import { NoPermissionState } from "@/components/empty-states/NoPermissionState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/\"/g, '""')}"`;
  };

  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Audit() {
  const role = useRole();
  const isAdmin = role.data === "admin";

  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filters = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00.000Z`).toISOString() : undefined;
    const to = toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : undefined;
    return {
      userId: userId.trim() || undefined,
      action: action.trim() || undefined,
      from,
      to,
      limit: 300,
    };
  }, [userId, action, fromDate, toDate]);

  const auditQuery = useImmutableAuditLog(filters);

  if (role.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria (Compliance)</h1>
          <p className="text-muted-foreground">Logs append-only</p>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <NoPermissionState resource="auditoria" />;
  }

  const rows = auditQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria (Compliance)</h1>
          <p className="text-muted-foreground">Logs append-only com filtros e export</p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              `audit-${new Date().toISOString().slice(0, 10)}.csv`,
              rows.map((r) => ({
                ...r,
                metadata: r.metadata ?? {},
              }))
            )
          }
          disabled={!rows.length}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Usuário (UUID)</div>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="ex: 9b3f..." />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Ação (contém)</div>
              <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="ex: auth.login" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">De</div>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Até</div>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : auditQuery.isError ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="h-4 w-4" /> Falha ao carregar auditoria.
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum evento encontrado com os filtros atuais.</div>
          ) : (
            <ul className="space-y-3">
              {rows.map((e) => (
                <li key={e.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{e.action}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}
                        {e.user_id ? ` • user: ${e.user_id}` : ""}
                        {e.workspace_id ? ` • ws: ${e.workspace_id}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.entity_type ? `Entidade: ${e.entity_type}` : ""}
                      {e.entity_id ? ` • ${e.entity_id}` : ""}
                    </div>
                  </div>

                  {(e.ip_address || e.user_agent) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {e.ip_address ? <span>IP: {e.ip_address}</span> : null}
                      {e.user_agent ? <span>{e.ip_address ? " • " : ""}UA: {e.user_agent}</span> : null}
                    </div>
                  )}

                  {e.metadata && Object.keys(e.metadata).length > 0 ? (
                    <pre className="mt-3 overflow-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
