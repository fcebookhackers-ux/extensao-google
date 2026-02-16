import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardPageShell } from "@/pages/dashboard/_DashboardPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSLIMetrics, type SLIMetricRow } from "@/hooks/useSLIMetrics";

type DomainKey = "webhooks" | "uploads" | "automations" | "sync";

const DOMAIN_LABEL: Record<DomainKey, string> = {
  webhooks: "Webhooks",
  uploads: "Uploads",
  automations: "Automações",
  sync: "Sync offline",
};

function formatMetricName(metric: string) {
  switch (metric) {
    case "success_rate":
      return "Taxa de sucesso";
    case "p95_latency_ms":
      return "Latência P95";
    default:
      return metric;
  }
}

function formatMetricValue(value: number, metric: string) {
  if (Number.isNaN(value)) return "—";
  if (metric === "success_rate") return `${value.toFixed(2)}%`;
  if (metric === "p95_latency_ms") return `${Math.round(value)} ms`;
  return String(value);
}

function groupBy<T>(rows: T[], key: (r: T) => string) {
  return rows.reduce<Record<string, T[]>>((acc, r) => {
    const k = key(r);
    (acc[k] ||= []).push(r);
    return acc;
  }, {});
}

function clampPct(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function latestByMetric(rows: SLIMetricRow[]) {
  const byMetric = groupBy(rows, (r) => r.metric_name);
  return Object.entries(byMetric)
    .map(([metric, values]) => {
      const sorted = [...values].sort((a, b) => b.created_at.localeCompare(a.created_at));
      return { metric, values: sorted, latest: sorted[0] };
    })
    .sort((a, b) => a.metric.localeCompare(b.metric));
}

function ViolationBadge({ isViolation }: { isViolation: boolean }) {
  return <Badge variant={isViolation ? "destructive" : "secondary"}>{isViolation ? "Violado" : "Ok"}</Badge>;
}

function MetricTrend({ metric, values }: { metric: string; values: SLIMetricRow[] }) {
  const data = useMemo(
    () =>
      [...values]
        .slice()
        .reverse()
        .map((v) => ({
          t: new Date(v.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          value: Number(v.value),
          target: Number(v.target),
        })),
    [values],
  );

  return (
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(v: any) => [formatMetricValue(Number(v), metric), formatMetricName(metric)]}
          />
          <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function SLIs() {
  const q = useSLIMetrics(7);

  const domains = useMemo(() => {
    const rows = q.data ?? [];
    const byDomain = groupBy(rows, (r) => r.domain);
    return Object.entries(byDomain)
      .map(([domain, values]) => ({ domain, values }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }, [q.data]);

  return (
    <DashboardPageShell title="SLIs / SLOs" description="Indicadores e objetivos por domínio (últimos 7 dias).">
      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : q.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Falha ao carregar SLIs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {(q.error as any)?.message ?? "Tente novamente."}
          </CardContent>
        </Card>
      ) : domains.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem métricas ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            As métricas são agregadas a cada 15 minutos pela Edge Function <code>calculate-slis</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {domains.map(({ domain, values }) => {
            const d = (domain as DomainKey) in DOMAIN_LABEL ? (domain as DomainKey) : null;
            const title = d ? DOMAIN_LABEL[d] : domain;
            const metrics = latestByMetric(values);

            return (
              <Card key={domain}>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {metrics.map(({ metric, latest, values }) => {
                    const isViolation = Number(latest.value) < Number(latest.target);
                    const pct =
                      metric === "success_rate"
                        ? clampPct((Number(latest.value) / Math.max(Number(latest.target), 0.0001)) * 100)
                        : clampPct((Number(latest.target) / Math.max(Number(latest.value), 0.0001)) * 100);

                    return (
                      <section key={metric} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{formatMetricName(metric)}</div>
                            <div className="text-xs text-muted-foreground">
                              Último valor: <span className="font-mono">{formatMetricValue(Number(latest.value), metric)}</span>
                              <span className="mx-1">•</span>
                              Target: <span className="font-mono">{formatMetricValue(Number(latest.target), metric)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <ViolationBadge isViolation={isViolation} />
                          </div>
                        </div>

                        <Progress value={pct} />
                        <MetricTrend metric={metric} values={values.slice(0, 24)} />
                      </section>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardPageShell>
  );
}
