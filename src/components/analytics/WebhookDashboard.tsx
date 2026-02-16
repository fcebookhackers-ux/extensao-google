import * as React from "react";
import { Activity, CheckCircle2, XCircle, Clock, Zap, AlertTriangle, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGlobalWebhookAnalytics, useWebhookAnalyticsSummaries, useWebhooksHealthCheck } from "@/hooks/useWebhookAnalytics";

export function WebhookDashboard() {
  const analyticsQuery = useGlobalWebhookAnalytics();
  const summariesQuery = useWebhookAnalyticsSummaries();
  const healthQuery = useWebhooksHealthCheck();

  const analytics = analyticsQuery.data;
  const summaries = summariesQuery.data ?? [];
  const healthChecks = healthQuery.data ?? [];

  const criticalWebhooks = healthChecks.filter((w) => w.healthStatus === "critical").length;
  const warningWebhooks = healthChecks.filter((w) => w.healthStatus === "warning").length;

  if (analyticsQuery.isLoading || !analytics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Analytics de Webhooks</h2>
        <p className="mt-1 text-sm text-muted-foreground">Monitoramento e estatísticas dos seus webhooks.</p>
      </div>

      {/* Alertas críticos */}
      {criticalWebhooks > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {criticalWebhooks} webhook{criticalWebhooks !== 1 ? "s" : ""} com problemas críticos
          </AlertTitle>
          <AlertDescription>Verifique a seção de saúde abaixo para mais detalhes.</AlertDescription>
        </Alert>
      )}

      {warningWebhooks > 0 && !criticalWebhooks && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {warningWebhooks} webhook{warningWebhooks !== 1 ? "s" : ""} com avisos
          </AlertTitle>
          <AlertDescription>Alguns webhooks podem precisar de atenção.</AlertDescription>
        </Alert>
      )}

      {/* Cards de estatísticas principais */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{analytics.totalWebhooks}</div>
            <div className="text-xs text-muted-foreground">{analytics.activeWebhooks} ativos</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{analytics.successRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {analytics.successfulDeliveries.toLocaleString()} de {analytics.totalDeliveries.toLocaleString()} entregas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <XCircle className="h-4 w-4 text-destructive" />
              Falhas Totais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{analytics.failedDeliveries.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              {analytics.totalDeliveries > 0
                ? ((analytics.failedDeliveries / analytics.totalDeliveries) * 100).toFixed(1)
                : 0}
              % do total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{Math.round(analytics.avgResponseTimeMs)}ms</div>
            <div className="text-xs text-muted-foreground">tempo de resposta</div>
          </CardContent>
        </Card>
      </div>

      {/* Status de Saúde */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Status de Saúde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {healthChecks.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum webhook configurado.</div>
          ) : (
            healthChecks.map((health) => {
              const statusConfig: Record<
                string,
                { label: string; class: string; icon: React.ComponentType<{ className?: string }> }
              > = {
                healthy: { label: "Saudável", class: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
                warning: { label: "Atenção", class: "bg-secondary/10 text-secondary border-secondary/20", icon: AlertTriangle },
                critical: {
                  label: "Crítico",
                  class: "bg-destructive/10 text-destructive border-destructive/20",
                  icon: XCircle,
                },
                inactive: { label: "Inativo", class: "bg-muted text-muted-foreground border-border", icon: Activity },
              };

              const config = statusConfig[health.healthStatus] ?? statusConfig.inactive;
              const Icon = config.icon;

              return (
                <div key={health.webhookId} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-medium">{health.name}</div>
                      {health.circuitState === "open" && (
                        <Badge variant="destructive" className="shrink-0 text-[10px]">
                          Circuit Aberto
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{health.url}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>24h: {health.deliveries24h} entregas</span>
                      {health.failures24h > 0 && <span className="text-destructive">· {health.failures24h} falhas</span>}
                    </div>
                  </div>
                  <Badge className={cn("shrink-0", config.class)} variant="outline">
                    <Icon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Lista de webhooks individuais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhooks Individuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summaries.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum webhook com entregas registradas.</div>
          ) : (
            summaries.map((webhook) => (
              <div key={webhook.webhookId} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium">{webhook.webhookName}</div>
                      {webhook.circuitBreakerState === "open" && (
                        <Badge variant="destructive" className="shrink-0 text-[10px]">
                          Circuit Aberto
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{webhook.url}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>

                <div className="grid gap-2 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Entregas</div>
                    <div className="font-medium tabular-nums">{webhook.totalDeliveries.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Taxa de Sucesso</div>
                    <div className="font-medium tabular-nums">{webhook.successRatePercentage.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Tempo Médio</div>
                    <div className="font-medium tabular-nums">{Math.round(webhook.avgResponseTimeMs)}ms</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Falhas</div>
                    <div className="font-medium tabular-nums text-destructive">{webhook.failedDeliveries}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
