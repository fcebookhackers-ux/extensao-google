import * as React from "react";
import { RefreshCw, Trash2, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";

import { DashboardPageShell } from "@/pages/dashboard/_DashboardPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead";

type WebhookJob = {
  id: string;
  webhook_id: string;
  event_type: string;
  status: JobStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type Metrics = {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  dead: number;
  processed_last_60m: number;
  jobs_per_minute_60m: number;
  success_rate_60m: number;
  avg_latency_ms_60m: number;
  per_webhook_60m?: Array<{ webhook_id: string; deliveries: number; success_rate: number; avg_latency_ms: number }>;
};

function statusBadge(status: JobStatus) {
  const map: Record<JobStatus, { label: string; className: string }>= {
    pending: { label: "Pendente", className: "bg-secondary/10 text-secondary border-secondary/20" },
    processing: { label: "Processando", className: "bg-primary/10 text-primary border-primary/20" },
    completed: { label: "Concluído", className: "bg-primary/10 text-primary border-primary/20" },
    failed: { label: "Falhou", className: "bg-destructive/10 text-destructive border-destructive/20" },
    dead: { label: "Dead", className: "bg-muted text-muted-foreground border-border" },
  };
  const cfg = map[status];
  return <Badge variant="outline" className={cn("whitespace-nowrap", cfg.className)}>{cfg.label}</Badge>;
}

async function invokeWorker<T>(body: any) {
  const { data, error } = await supabase.functions.invoke("webhook-worker", { body });
  if (error) throw error;
  return data as T;
}

export default function WebhookJobs() {
  const [status, setStatus] = React.useState<JobStatus | "all">("all");
  const [webhookId, setWebhookId] = React.useState<string>("all");
  const [loading, setLoading] = React.useState(true);
  const [jobs, setJobs] = React.useState<WebhookJob[]>([]);
  const [metrics, setMetrics] = React.useState<Metrics | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [m, list] = await Promise.all([
        invokeWorker<Metrics>({
          action: "metrics",
          webhook_id: webhookId === "all" ? null : webhookId,
          status: status === "all" ? null : status,
        }),
        invokeWorker<{ items: WebhookJob[] }>({
          action: "list",
          webhook_id: webhookId === "all" ? null : webhookId,
          status: status === "all" ? null : status,
          limit: 100,
        }),
      ]);
      setMetrics(m);
      setJobs(list.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [status, webhookId]);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const webhooksQuery = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("webhooks")
      .select("id,name")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; name: string }>;
  }, []);

  const [webhooks, setWebhooks] = React.useState<Array<{ id: string; name: string }>>([]);
  React.useEffect(() => {
    let mounted = true;
    void webhooksQuery().then((rows) => {
      if (mounted) setWebhooks(rows);
    }).catch(() => {
      // silencioso
    });
    return () => {
      mounted = false;
    };
  }, [webhooksQuery]);

  return (
    <DashboardPageShell
      title="Fila de Webhooks"
      description="Monitoramento de jobs, retentativas e fila de dead letters."
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="dead">Dead</SelectItem>
            </SelectContent>
          </Select>

          <Select value={webhookId} onValueChange={(v) => setWebhookId(v)}>
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="Webhook" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os webhooks</SelectItem>
              {webhooks.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={async () => {
              await invokeWorker<{ deleted: number }>({ action: "purge_dead", older_than_days: 30 });
              setRefreshKey((k) => k + 1);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Purge dead (&gt;30d)
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loading || !metrics ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />)
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Jobs/min</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{metrics.jobs_per_minute_60m}</div>
                <div className="text-xs text-muted-foreground">últimos 60 min</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-primary" /> Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{metrics.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{metrics.success_rate_60m.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">últimos 60 min</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <XCircle className="h-4 w-4 text-destructive" /> Latência média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{Math.round(metrics.avg_latency_ms_60m)}ms</div>
                <div className="text-xs text-muted-foreground">últimos 60 min</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4 text-muted-foreground" /> DLQ (dead)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{metrics.dead}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {metrics?.per_webhook_60m && metrics.per_webhook_60m.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top webhooks (últimos 60 min)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Entregas</TableHead>
                  <TableHead>Sucesso</TableHead>
                  <TableHead>Latência média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.per_webhook_60m.map((r) => (
                  <TableRow key={r.webhook_id}>
                    <TableCell className="font-mono text-xs">{r.webhook_id}</TableCell>
                    <TableCell className="tabular-nums">{r.deliveries}</TableCell>
                    <TableCell className="tabular-nums">{r.success_rate.toFixed(1)}%</TableCell>
                    <TableCell className="tabular-nums">{Math.round(r.avg_latency_ms)}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum job encontrado.</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Próxima tentativa</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>{statusBadge(j.status)}</TableCell>
                      <TableCell className="max-w-[260px] truncate font-mono text-xs">{j.event_type}</TableCell>
                      <TableCell className="tabular-nums">
                        {j.retry_count}/{j.max_retries}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {j.next_retry_at ? new Date(j.next_retry_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={async () => {
                            await invokeWorker({ action: "retry_now", job_id: j.id });
                            setRefreshKey((k) => k + 1);
                          }}
                          disabled={j.status === "processing"}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}
