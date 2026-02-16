import * as React from "react";
import { Check, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { whatsappMock } from "@/pages/dashboard/relatorios/mockData";
import { cn } from "@/lib/utils";

function HealthMetric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function segmentClass(status: "online" | "offline" | "reconnecting") {
  if (status === "online") return "bg-primary";
  if (status === "offline") return "bg-destructive";
  return "bg-muted";
}

export function WhatsAppTab() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HealthMetric title="Uptime" value={`${whatsappMock.health.uptimePct}%`} />
        <HealthMetric title="Latência Média" value={`${whatsappMock.health.avgLatencyMs}ms`} />
        <HealthMetric title="Mensagens na Fila" value={`${whatsappMock.health.queue}`} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponibilidade (últimas 24h)</CardTitle>
          <div className="text-sm text-muted-foreground">Online / offline / reconectando</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
              <div className="flex h-4 w-full">
                {whatsappMock.uptime24h.map((s) => {
                  const start = Number(s.start.split(":")[0]) + Number(s.start.split(":")[1]) / 60;
                  const end = Number(s.end.split(":")[0]) + Number(s.end.split(":")[1]) / 60;
                  const w = Math.max(0.5, ((end - start) / 24) * 100);
                  return (
                    <div
                      key={`${s.start}-${s.end}-${s.status}`}
                      className={cn("h-4", segmentClass(s.status))}
                      style={{ width: `${w}%` }}
                      title={`${s.start}–${s.end}: ${s.status}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> online
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" /> offline
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted" /> reconectando
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {whatsappMock.events.map((e, idx) => (
                <TableRow key={idx}>
                  <TableCell className="tabular-nums">{e.ts}</TableCell>
                  <TableCell>{e.event}</TableCell>
                  <TableCell>
                    {e.status === "ok" ? (
                      <Badge className="gap-1">
                        <Check className="h-3.5 w-3.5" />
                        OK
                      </Badge>
                    ) : e.status === "warn" ? (
                      <Badge variant="outline" className="gap-1">
                        <TriangleAlert className="h-3.5 w-3.5 text-accent" />
                        Atenção
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <X className="h-3.5 w-3.5" />
                        Falha
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
