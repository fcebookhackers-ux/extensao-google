import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle,
  Clock,
  Download,
  Shield,
  Trash2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import { useAccountDeletion, useConsents, useDataExport } from "@/hooks/usePrivacy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PrivacyCenter() {
  const { exports, requestExport, isRequesting } = useDataExport();
  const { deletions, pendingDeletion, requestDeletion, cancelDeletion, isRequesting: isDeletionRequesting, isCancelling } =
    useAccountDeletion();
  const { consents } = useConsents();

  const [deletionReason, setDeletionReason] = useState("");

  const latestExport = exports[0];
  const canDownload = latestExport?.status === "completed" && !!latestExport.download_url;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Central de Privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus dados pessoais e preferências de privacidade conforme a LGPD.
        </p>
      </header>

      {pendingDeletion ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Exclusão de conta agendada</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Sua conta será excluída permanentemente em {new Date(pendingDeletion.scheduled_for).toLocaleDateString("pt-BR")}.
            </p>
            <Button variant="outline" onClick={() => cancelDeletion(pendingDeletion.id)} disabled={isCancelling}>
              {isCancelling ? "Cancelando…" : "Cancelar exclusão"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Exportar meus dados
          </CardTitle>
          <CardDescription>Baixe uma cópia completa de todos os seus dados em formato JSON.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Última solicitação</p>
              {latestExport ? (
                <p className="text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Badge variant="secondary">
                      {latestExport.status === "completed" && "Concluída"}
                      {latestExport.status === "processing" && "Processando"}
                      {latestExport.status === "pending" && "Pendente"}
                      {latestExport.status === "failed" && "Falhou"}
                      {latestExport.status === "expired" && "Expirada"}
                    </Badge>
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
            <li>O arquivo incluirá dados como: contatos, automações e consentimentos.</li>
            <li>A exportação pode levar alguns minutos dependendo do volume.</li>
            <li>O link de download expira em 7 dias após a conclusão.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Histórico de consentimentos
          </CardTitle>
          <CardDescription>Registro de todas as suas preferências e consentimentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum consentimento registrado.</p>
          ) : (
            <div className="space-y-2">
              {consents.map((consent) => (
                <div key={consent.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-background p-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium capitalize">{consent.consent_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      v{consent.policy_version} • {new Date(consent.granted_at).toLocaleString("pt-BR")}
                      {consent.ip_address ? ` • IP: ${consent.ip_address}` : ""}
                    </p>
                  </div>
                  {consent.granted ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Concedido
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Negado
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Excluir minha conta
          </CardTitle>
          <CardDescription>
            Esta ação é irreversível. A exclusão é agendada com período de graça de 30 dias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">O que será excluído</p>
            <Separator className="my-2" />
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Seus dados pessoais e preferências</li>
              <li>Automações criadas e configurações</li>
              <li>Histórico de consentimentos</li>
            </ul>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={!!pendingDeletion}>
                {pendingDeletion ? "Exclusão já agendada" : "Solicitar exclusão"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar exclusão de conta</DialogTitle>
                <DialogDescription>
                  Isso agendará a exclusão permanente da sua conta para 30 dias a partir de agora. Você poderá cancelar durante esse
                  período.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <p className="text-sm font-medium">Por que você está saindo? (opcional)</p>
                <Textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Seu feedback nos ajuda a melhorar..."
                  rows={4}
                />
                {deletions.length > 0 ? (
                  <p className="text-xs text-muted-foreground">Você tem {deletions.length} solicitação(ões) recentes registradas.</p>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline">Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={() => requestDeletion(deletionReason || undefined)}
                  disabled={isDeletionRequesting}
                >
                  {isDeletionRequesting ? "Processando…" : "Confirmar exclusão"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 flex-shrink-0" />
            <div className="space-y-2">
              <h2 className="font-semibold">Seus direitos sob a LGPD</h2>
              <p className="text-sm text-muted-foreground">
                Você pode acessar, corrigir, portar e solicitar exclusão/anonimização quando aplicável.
              </p>
              <Button variant="link" className="h-auto p-0" asChild>
                <a href="/politica-de-privacidade" target="_blank" rel="noreferrer">
                  Leia nossa Política de Privacidade completa →
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
