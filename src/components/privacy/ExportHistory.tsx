import { Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useDataExport } from "@/hooks/usePrivacy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportStatusLabel } from "@/components/privacy/privacy-status";

export function ExportHistory() {
  const { exports, isLoading } = useDataExport({ refetchIntervalMs: 30_000 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de exportações</CardTitle>
        <CardDescription>Downloads disponíveis quando o status estiver concluído.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : exports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma exportação encontrada.</p>
        ) : (
          <div className="space-y-2">
            {exports.map((item) => {
              const canDownload = item.status === "completed" && !!item.download_url;
              return (
                <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">Solicitação #{item.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.requested_at), { addSuffix: true, locale: ptBR })}
                      {item.expires_at ? ` • expira em ${new Date(item.expires_at).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{exportStatusLabel(item.status)}</Badge>
                    {canDownload ? (
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <a href={item.download_url!} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" /> Baixar
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
