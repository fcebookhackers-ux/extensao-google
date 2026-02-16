import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditEvents } from "@/hooks/useAudit";
import type { AuditAction, EntityType } from "@/types/audit";

function getActionType(action: string) {
  return action.split(".")[1] ?? "default";
}

function getActionPresentation(action: AuditAction): {
  Icon: React.ComponentType<{ className?: string }>;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
} {
  const type = getActionType(action);

  switch (type) {
    case "created":
    case "published":
      return { Icon: CheckCircle2, badgeVariant: "default" };
    case "updated":
    case "status_changed":
      return { Icon: Info, badgeVariant: "secondary" };
    case "paused":
      return { Icon: AlertCircle, badgeVariant: "outline" };
    case "deleted":
      return { Icon: XCircle, badgeVariant: "destructive" };
    default:
      return { Icon: Activity, badgeVariant: "outline" };
  }
}

export function AuditLog({
  entityType,
  entityId,
  limit,
}: {
  entityType?: EntityType;
  entityId?: string;
  limit?: number;
}) {
  const { data: events, isLoading, isError, error } = useAuditEvents({
    entityType,
    entityId,
    limit,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Atividades</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">Falha ao carregar auditoria: {(error as any)?.message ?? "Erro"}</div>
        ) : !events || events.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum evento registrado.</div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => {
              const { Icon, badgeVariant } = getActionPresentation(event.action);

              return (
                <li key={event.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 rounded-md border bg-muted p-2">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={badgeVariant} className="font-normal">
                            {event.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>

                        {event.entity_type ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Entidade: {event.entity_type}
                            {event.entity_id ? ` • ID: ${event.entity_id}` : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {event.metadata && Object.keys(event.metadata).length > 0 ? (
                    <div className="mt-3 rounded-md bg-muted p-2">
                      <div className="text-xs font-medium">Detalhes</div>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="break-words">
                            <span className="font-medium text-foreground">{key}:</span> {JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(event.ip_address || event.user_agent || event.session_id) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {event.ip_address ? <span>IP: {event.ip_address}</span> : null}
                      {event.user_agent ? <span>{event.ip_address ? " • " : ""}UA: {event.user_agent}</span> : null}
                      {event.session_id ? <span>{event.ip_address || event.user_agent ? " • " : ""}Sessão: {event.session_id}</span> : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
