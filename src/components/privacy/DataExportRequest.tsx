import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download } from "lucide-react";

import { useDataExport } from "@/hooks/usePrivacy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportStatusLabel } from "@/components/privacy/privacy-status";

export function DataExportRequest() {
  const { exports, requestExport, isRequesting } = useDataExport({ refetchIntervalMs: 30_000 });
  const latestExport = exports[0];
  const canDownload = latestExport?.status === "completed" && !!latestExport.download_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" /> Exportar meus dados
        </CardTitle>
        <CardDescription>Solicite uma exportação; o link de download expira em 7 dias.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Última solicitação</p>
            {latestExport ? (
              <p className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Badge variant="secondary">{exportStatusLabel(latestExport.status)}</Badge>
                  <span>
                    {formatDistanceToNow(new Date(latestExport.requested_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação anterior</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canDownload ? (
              <Button asChild variant="outline" className="gap-2">
                <a href={latestExport!.download_url!} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" /> Baixar
                </a>
              </Button>
            ) : null}
            <Button onClick={() => requestExport()} disabled={isRequesting || latestExport?.status === "processing"}>
              {isRequesting ? "Solicitando…" : "Nova exportação"}
            </Button>
          </div>
        </div>

        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>A exportação roda em background (Edge Function) e pode levar alguns minutos.</li>
          <li>O download é disponibilizado via signed URL.</li>
          <li>O status atualiza automaticamente a cada 30s.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
