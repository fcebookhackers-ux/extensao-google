import * as React from "react";
import { Bell, Plus, RefreshCw, Trash2 } from "lucide-react";

import { DashboardPageShell } from "@/pages/dashboard/_DashboardPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { AlertConfigDialog } from "@/components/alerts/AlertConfigDialog";
import { useAlertConfigs, useAlertHistory, useDeleteAlertConfig, useRunAlertsCheck, useToggleAlertConfig } from "@/hooks/useAlerts";
import type { AlertConfigRow } from "@/types/alerts";

export default function DashboardAlertas() {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AlertConfigRow | null>(null);

  const configsQuery = useAlertConfigs();
  const historyQuery = useAlertHistory(25);
  const toggle = useToggleAlertConfig();
  const del = useDeleteAlertConfig();
  const runCheck = useRunAlertsCheck();

  const configs = configsQuery.data ?? [];
  const history = historyQuery.data ?? [];

  return (
    <DashboardPageShell
      title="Alertas"
      description="Crie alertas configuráveis para eventos críticos (notificações in-app)."
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">{configs.length} alertas configurados</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => runCheck.mutate()}
            disabled={runCheck.isPending}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Checar agora
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar alerta
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Alertas configurados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {configsQuery.isLoading ? (
              <div className="py-8 text-sm text-muted-foreground">Carregando…</div>
            ) : configs.length === 0 ? (
              <div className="py-8 text-sm text-muted-foreground">Nenhum alerta criado ainda.</div>
            ) : (
              configs.map((c) => (
                <div key={c.id} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="h-5">
                        {c.alert_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">canal: in-app</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ativo</span>
                      <Switch
                        checked={c.enabled}
                        onCheckedChange={(v) => toggle.mutate({ id: c.id, enabled: v })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => del.mutate(c.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyQuery.isLoading ? (
              <div className="py-8 text-sm text-muted-foreground">Carregando…</div>
            ) : history.length === 0 ? (
              <div className="py-8 text-sm text-muted-foreground">Nenhum alerta disparado recentemente.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={h.severity === "critical" ? "destructive" : "secondary"} className="h-5">
                      {h.severity}
                    </Badge>
                    <div className="text-xs text-muted-foreground">{new Date(h.triggered_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{h.message}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AlertConfigDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
      />
    </DashboardPageShell>
  );
}
