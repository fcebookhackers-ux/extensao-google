import * as React from "react";
import { AlertTriangle, BarChart3, Clock, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AutomationFunnelStep, AutomationRow } from "@/pages/dashboard/relatorios/mockData";

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function AutomationDetailsDialog({
  open,
  onOpenChange,
  automation,
  funnel,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  automation: AutomationRow | null;
  funnel: readonly AutomationFunnelStep[];
  onEdit: () => void;
}) {
  const total = funnel[0]?.value ?? 0;

  const drops = funnel
    .slice(0, -1)
    .map((s, i) => {
      const next = funnel[i + 1];
      const drop = Math.max(0, s.value - (next?.value ?? 0));
      const dropPct = s.value ? (drop / s.value) * 100 : 0;
      return { idx: i, label: s.label, drop, dropPct };
    })
    .sort((a, b) => b.dropPct - a.dropPct);

  const worst = drops[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <span>ZapFllow: {automation?.name ?? "—"}</span>
            <Badge variant="outline" className="ml-0">
              Período: últimos 7 dias (mock)
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {funnel.map((step, idx) => {
                  const next = funnel[idx + 1];
                  const drop = next ? Math.max(0, step.value - next.value) : 0;
                  const dropPct = next ? (step.value ? (drop / step.value) * 100 : 0) : 0;
                  const isDrop = next && dropPct >= 7;

                  const widthPct = total ? Math.max(8, (step.value / total) * 100) : 0;

                  return (
                    <div key={`${step.label}-${idx}`} className="space-y-2">
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-sm font-medium">{step.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {step.value.toLocaleString()} ({percent(step.value, total)}%)
                        </div>
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-3 rounded-full", isDrop ? "bg-destructive" : "bg-primary")}
                          style={{ width: `${widthPct}%` }}
                          title={`${step.value}`}
                        />
                      </div>

                      {next ? (
                        <div className={cn("text-xs", isDrop ? "text-destructive" : "text-muted-foreground")}
                             title={`${drop} pessoas abandonaram nesta etapa (${dropPct.toFixed(1)}%)`}>
                          ↓ -{drop} ({dropPct.toFixed(1)}%)
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Métricas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" /> Taxa de conclusão
                    </div>
                    <div className="font-medium">{automation?.completionRatePct ?? 0}%</div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" /> Tempo médio
                    </div>
                    <div className="font-medium">{automation?.avgCompletion ?? "—"}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" /> Conversões
                    </div>
                    <div className="font-medium">{automation?.conversions ?? 0}</div>
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg border p-3">
                  <div className="inline-flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Maior gargalo
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {worst ? `${worst.label} (${worst.dropPct.toFixed(1)}% drop)` : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onEdit}>Editar ZapFllow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
