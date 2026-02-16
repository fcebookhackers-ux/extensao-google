import { z } from "zod";
import { AlertTriangle, Trash2 } from "lucide-react";

import { useAccountDeletion } from "@/hooks/usePrivacy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useValidatedForm } from "@/hooks/useValidatedForm";

const schema = z.object({
  reason: z
    .string()
    .max(1000, "Motivo muito longo (máx. 1000 caracteres)")
    .optional()
    .or(z.literal("")),
});

export function DataDeletionRequest() {
  const { deletions, pendingDeletion, requestDeletion, cancelDeletion, isRequesting, isCancelling } = useAccountDeletion({
    refetchIntervalMs: 30_000,
  });

  const form = useValidatedForm(schema, {
    defaultValues: { reason: "" },
  });

  return (
    <div className="space-y-4">
      {pendingDeletion ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Exclusão de conta agendada</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Sua conta será excluída permanentemente em {new Date(pendingDeletion.scheduled_for).toLocaleDateString("pt-BR")}. Você
              pode cancelar até lá.
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
            <Trash2 className="h-5 w-5" /> Excluir minha conta
          </CardTitle>
          <CardDescription>Esta ação é irreversível. A exclusão é agendada com período de graça de 30 dias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-2"
            onSubmit={form.handleSubmit((values) => {
              requestDeletion(values.reason || undefined);
            })}
          >
            <div className="space-y-2">
              <p className="text-sm font-medium">Motivo (opcional)</p>
              <Textarea placeholder="Seu feedback nos ajuda a melhorar..." rows={4} {...form.register("reason")} />
              {deletions.length > 0 ? (
                <p className="text-xs text-muted-foreground">Você tem {deletions.length} solicitação(ões) recente(s) registrada(s).</p>
              ) : null}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={!!pendingDeletion}>
                  {pendingDeletion ? "Exclusão já agendada" : "Solicitar exclusão"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão de conta</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso agendará a exclusão permanente da sua conta para 30 dias a partir de agora. Você poderá cancelar durante esse
                    período.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button type="submit" variant="destructive" disabled={isRequesting}>
                      {isRequesting ? "Processando…" : "Confirmar exclusão"}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
