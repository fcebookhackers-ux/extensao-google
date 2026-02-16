import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowLeft, Eye, RotateCcw, Clock, User } from "lucide-react";

import { useAutomationVersions } from "@/hooks/useAutomationVersions";
import type { AutomationVersion } from "@/types/versioning";
import { VersionDiffDialog } from "@/components/automation/VersionDiffDialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AutomacoesVersoes() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { versions, isLoading, rollback, isRollingBack } = useAutomationVersions(id);

  const [diffPair, setDiffPair] = React.useState<{
    a: AutomationVersion;
    b: AutomationVersion;
  } | null>(null);

  const [rollbackTarget, setRollbackTarget] = React.useState<string | null>(null);

  const openDiffForIndex = (idx: number) => {
    const current = versions[idx];
    const previous = versions[idx + 1];
    if (!current || !previous) return;
    setDiffPair({ a: previous as AutomationVersion, b: current as AutomationVersion });
  };

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
            <History className="h-4 w-4" /> Versões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Versões da automação</h1>
          <p className="text-sm text-muted-foreground">Histórico append-only com rollback.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="inline-flex items-center gap-2 text-sm">
              <History className="h-4 w-4" /> Timeline
            </CardTitle>
            <Badge variant="secondary">
              {versions.length} {versions.length === 1 ? "versão" : "versões"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[520px]">
            <div className="space-y-3 pr-3">
              {versions.map((v, idx) => {
                const hasPrev = !!versions[idx + 1];
                const isCurrent = !!v.is_current;

                return (
                  <div key={v.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">Versão {v.version_number}</p>
                          {isCurrent ? <Badge variant="secondary">Atual</Badge> : null}
                          {v.published_at ? <Badge variant="outline">Publicada</Badge> : null}
                          {v.rollback_from ? <Badge variant="outline">Rollback</Badge> : null}
                        </div>

                        {v.change_summary ? (
                          <p className="text-xs text-muted-foreground">{v.change_summary}</p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(v.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {(v as any).created_by?.email ?? v.user_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={!hasPrev}
                          onClick={() => openDiffForIndex(idx)}
                          title={!hasPrev ? "Não há versão anterior para comparar" : ""}
                        >
                          <Eye className="h-4 w-4" /> Ver Diff
                        </Button>

                        {!isCurrent ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setRollbackTarget(v.id)}
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

      {diffPair ? (
        <VersionDiffDialog
          open={true}
          onOpenChange={(open) => (!open ? setDiffPair(null) : undefined)}
          versionA={diffPair.a}
          versionB={diffPair.b}
        />
      ) : null}

      <Dialog open={!!rollbackTarget} onOpenChange={(open) => (!open ? setRollbackTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar rollback</DialogTitle>
            <DialogDescription>
              Isso criará uma nova versão com o conteúdo da versão selecionada. O histórico é mantido.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            Você está prestes a restaurar para a versão{" "}
            <span className="font-semibold">{versions.find((x) => x.id === rollbackTarget)?.version_number ?? "—"}</span>.
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
    </div>
  );
}
