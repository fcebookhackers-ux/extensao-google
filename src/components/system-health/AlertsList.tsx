import { AlertTriangle, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SystemStatus } from "@/components/system-health/SystemStatusIndicator";

export type HealthAlert = {
  id: string;
  status: SystemStatus;
  title: string;
  description: string;
};

function statusBadgeVariant(status: SystemStatus): "default" | "secondary" | "destructive" {
  if (status === "critical") return "destructive";
  if (status === "warning") return "secondary";
  return "default";
}

export function AlertsList({ alerts }: { alerts: HealthAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4" />
          Alertas ativos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Nenhum alerta no momento.
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{a.title}</h3>
                      <Badge variant={statusBadgeVariant(a.status)}>
                        {a.status === "critical" ? "Crítico" : a.status === "warning" ? "Atenção" : "Ok"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
