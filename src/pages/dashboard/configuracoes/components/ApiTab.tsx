import * as React from "react";
import { Copy, Eye, EyeOff, ExternalLink, RefreshCw } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function StarterLockedApi() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API</CardTitle>
        <CardDescription>🔒 API disponível apenas nos Planos Pro e Enterprise</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/50 p-4 text-sm">
          Use a API para integrar com seus sistemas (bloqueado no Starter).
        </div>
        <Button type="button">Fazer Upgrade</Button>
      </CardContent>
    </Card>
  );
}

export function ApiTab() {
  // Mock de plano: Pro+
  const isStarter = false;

  // Use a non-secret-looking placeholder to avoid tripping GitHub push protection.
  const [apiKey, setApiKey] = React.useState("api_key_example_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
  const [visible, setVisible] = React.useState(false);

  if (isStarter) return <StarterLockedApi />;

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      toast({ title: "✅ Copiado", description: "Chave copiada para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Chave de API</CardTitle>
          <CardDescription>Use a API para integrar com seus sistemas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input readOnly value={visible ? apiKey : "•".repeat(Math.min(apiKey.length, 32))} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setVisible((v) => !v)}>
                {visible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {visible ? "Ocultar" : "Mostrar"}
              </Button>
              <Button type="button" variant="outline" onClick={copyKey}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerar chave?</AlertDialogTitle>
                    <AlertDialogDescription>
                      ⚠️ Atenção! Ao regenerar, a chave anterior será invalidada imediatamente. Atualize suas integrações.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        const next = `api_key_${Math.random().toString(36).slice(2, 30)}`;
                        setApiKey(next);
                        setVisible(true);
                        toast({ title: "✅ Chave regenerada" });
                      }}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <RateLimitsCard />

      <ApiLogsCard />

      <Card>
        <CardHeader>
          <CardTitle>Documentação da API</CardTitle>
          <CardDescription>Guias, referência e exemplos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <a
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
              href="https://example.com/docs/quickstart"
              target="_blank"
              rel="noreferrer"
            >
              <span>📘 Guia de Início Rápido</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
              href="https://example.com/docs/reference"
              target="_blank"
              rel="noreferrer"
            >
              <span>📖 Referência Completa</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              <span>💬 Exemplos de Código</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
              href="https://example.com/docs/changelog"
              target="_blank"
              rel="noreferrer"
            >
              <span>🐛 Changelog</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open("https://example.com/docs", "_blank")}
            >
              Ver Documentação Completa
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Principais Endpoints</CardTitle>
          <CardDescription>Resumo rápido (mock)</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <EndpointItem
              value="send"
              method="POST"
              path="/api/v1/messages/send"
              description="Enviar mensagem para contato"
              requestExample={
                '{\n  "to": "+5511987654321",\n  "message": "Olá! Como posso ajudar?"\n}'
              }
            />
            <EndpointItem value="contacts" method="GET" path="/api/v1/contacts" description="Listar contatos" />
            <EndpointItem
              value="trigger"
              method="POST"
              path="/api/v1/zapfllow/:id/trigger"
              description="Disparar ZapFllow manualmente"
            />
            <EndpointItem value="conversations" method="GET" path="/api/v1/conversations" description="Listar conversas" />
            <EndpointItem value="webhooks" method="POST" path="/api/v1/webhooks" description="Criar webhook" />
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function RateLimitsCard() {
  const plan = "Pro" as const;
  const usedToday = 234;
  const dailyLimit = 10_000;
  const percent = Math.min(100, Math.round((usedToday / dailyLimit) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Limites de Uso</CardTitle>
        <CardDescription>Rate limits (mock)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plano</TableHead>
              <TableHead>Requests/minuto</TableHead>
              <TableHead>Requests/dia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow data-state={plan === "Pro" ? "selected" : undefined}>
              <TableCell className="font-medium">Pro</TableCell>
              <TableCell>60</TableCell>
              <TableCell>10.000</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Enterprise</TableCell>
              <TableCell>300</TableCell>
              <TableCell>100.000</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Você usou</span>
            <span className="font-medium">
              {usedToday}/{dailyLimit.toLocaleString("pt-BR")} requests hoje
            </span>
          </div>
          <Progress value={percent} />
        </div>
      </CardContent>
    </Card>
  );
}

type ApiLogRow = {
  id: string;
  timestamp: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  status: number;
  latencyMs: number;
  ip: string;
};

function ApiLogsCard() {
  const [statusFilter, setStatusFilter] = React.useState<"all" | "2xx" | "4xx" | "5xx">("all");
  const [endpointFilter, setEndpointFilter] = React.useState<string>("all");

  const rows: ApiLogRow[] = React.useMemo(
    () => [
      { id: "1", timestamp: "27/01 14:32:15", endpoint: "/api/v1/messages/send", method: "POST", status: 200, latencyMs: 45, ip: "192.168.1.1" },
      { id: "2", timestamp: "27/01 14:30:12", endpoint: "/api/v1/contacts", method: "GET", status: 200, latencyMs: 32, ip: "192.168.1.1" },
      { id: "3", timestamp: "27/01 14:25:08", endpoint: "/api/v1/messages/send", method: "POST", status: 429, latencyMs: 12, ip: "192.168.1.1" },
      { id: "4", timestamp: "27/01 14:18:41", endpoint: "/api/v1/conversations", method: "GET", status: 200, latencyMs: 28, ip: "192.168.1.1" },
      { id: "5", timestamp: "27/01 14:12:03", endpoint: "/api/v1/webhooks", method: "POST", status: 201, latencyMs: 51, ip: "192.168.1.1" },
      { id: "6", timestamp: "27/01 13:59:50", endpoint: "/api/v1/contacts", method: "GET", status: 200, latencyMs: 31, ip: "192.168.1.1" },
      { id: "7", timestamp: "27/01 13:51:22", endpoint: "/api/v1/messages/send", method: "POST", status: 200, latencyMs: 47, ip: "192.168.1.1" },
      { id: "8", timestamp: "27/01 13:42:10", endpoint: "/api/v1/messages/send", method: "POST", status: 500, latencyMs: 9, ip: "192.168.1.1" },
      { id: "9", timestamp: "27/01 13:38:07", endpoint: "/api/v1/zapfllow/123/trigger", method: "POST", status: 200, latencyMs: 88, ip: "192.168.1.1" },
      { id: "10", timestamp: "27/01 13:31:54", endpoint: "/api/v1/contacts", method: "GET", status: 200, latencyMs: 35, ip: "192.168.1.1" },
    ],
    [],
  );

  const endpoints = React.useMemo(() => Array.from(new Set(rows.map((r) => r.endpoint))), [rows]);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      const okEndpoint = endpointFilter === "all" ? true : r.endpoint === endpointFilter;
      const okStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "2xx"
            ? r.status >= 200 && r.status < 300
            : statusFilter === "4xx"
              ? r.status >= 400 && r.status < 500
              : r.status >= 500 && r.status < 600;
      return okEndpoint && okStatus;
    });
  }, [rows, endpointFilter, statusFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Logs Recentes</CardTitle>
          <CardDescription>Últimas 24h (mock)</CardDescription>
        </div>
        <Button type="button" variant="link" className="h-auto px-0" onClick={() => toast({ title: "Abrir logs completos (mock)" })}>
          Ver Todos os Logs
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Status</p>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="2xx">2xx</SelectItem>
                <SelectItem value="4xx">4xx</SelectItem>
                <SelectItem value="5xx">5xx</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Endpoint</p>
            <Select value={endpointFilter} onValueChange={setEndpointFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {endpoints.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latência</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 10).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{r.timestamp}</TableCell>
                <TableCell className="font-mono text-xs">{r.endpoint}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.method}</Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.latencyMs}ms</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: number }) {
  if (status === 429) return <Badge variant="secondary">429 ⚠️</Badge>;
  if (status >= 200 && status < 300) return <Badge>{status} ✅</Badge>;
  if (status >= 400 && status < 500) return <Badge variant="secondary">{status}</Badge>;
  if (status >= 500) return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function EndpointItem({
  value,
  method,
  path,
  description,
  requestExample,
}: {
  value: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  requestExample?: string;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{method}</Badge>
          <span className="font-mono text-sm">{path}</span>
          <span className="text-sm text-muted-foreground">— {description}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        {requestExample ? (
          <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">
            <code>{requestExample}</code>
          </pre>
        ) : null}
        <Button type="button" variant="outline" onClick={() => toast({ title: "Ver documentação (mock)" })}>
          Ver Documentação
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}
