import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle,
  Clock,
  Eye,
  GitBranch,
  History,
  RotateCcw,
  User,
} from "lucide-react";

import { useAutomationVersions } from "@/hooks/useAutomationVersions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VersionHistoryProps {
  automationId: string;
  onPreview?: (versionId: string) => void;
}

export function VersionHistory({ automationId, onPreview }: VersionHistoryProps) {
  const { versions, isLoading, rollback, isRollingBack } = useAutomationVersions(automationId);
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);

  const handleRollback = () => {
    if (!rollbackTarget) return;
    rollback(rollbackTarget);
    setRollbackTarget(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="inline-flex items-center gap-2 text-sm">
            <History className="h-4 w-4" /> Histórico de versões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="inline-flex items-center gap-2 text-sm">
              <History className="h-4 w-4" /> Histórico de versões
            </CardTitle>
            <Badge variant="secondary">
              {versions.length} {versions.length === 1 ? "versão" : "versões"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[420px]">
            <div className="space-y-3 pr-3">
              {versions.map((version, index) => {
                const isLatest = index === 0;
                const isCurrent = version.is_current;
                const isRollback = !!version.rollback_from;

                return (
                  <div key={version.id} className="relative rounded-md border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">Versão {version.version_number}</p>

                          {isCurrent ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Atual
                            </Badge>
                          ) : null}
                          {version.published_at && !isCurrent ? (
                            <Badge variant="outline">Publicada</Badge>
                          ) : null}
                          {isLatest && !isCurrent ? <Badge variant="outline">Mais recente</Badge> : null}
                          {isRollback ? (
                            <Badge variant="outline" className="gap-1">
                              <GitBranch className="h-3.5 w-3.5" /> Rollback
                            </Badge>
                          ) : null}
                        </div>

                        {version.change_summary ? (
                          <p className="text-xs text-muted-foreground">{version.change_summary}</p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Criada{" "}
                            {formatDistanceToNow(new Date(version.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {version.created_by?.email ?? version.user_id}
                          </span>

                          {version.published_at ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Publicada{" "}
                              {formatDistanceToNow(new Date(version.published_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {onPreview ? (
                          <Button variant="outline" size="sm" onClick={() => onPreview(version.id)} className="gap-2">
                            <Eye className="h-4 w-4" /> Visualizar
                          </Button>
                        ) : null}

                        {!isCurrent ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRollbackTarget(version.id)}
                            className="gap-2"
                          >
                            <RotateCcw className="h-4 w-4" /> Restaurar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!rollbackTarget} onOpenChange={(open) => (!open ? setRollbackTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar rollback</DialogTitle>
            <DialogDescription>
              Isso criará uma nova versão com o conteúdo da versão selecionada. A versão atual será preservada no histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            Você está prestes a restaurar para a versão{" "}
            <span className="font-semibold">
              {versions.find((v) => v.id === rollbackTarget)?.version_number ?? "—"}
            </span>
            .
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)} disabled={isRollingBack}>
              Cancelar
            </Button>
            <Button onClick={handleRollback} disabled={isRollingBack}>
              {isRollingBack ? "Restaurando…" : "Confirmar restauração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
