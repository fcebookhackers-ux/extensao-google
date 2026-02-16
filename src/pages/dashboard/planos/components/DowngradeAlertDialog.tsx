import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

export function DowngradeAlertDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [ack, setAck] = React.useState(false);

  // Mock: tem 1547 contatos; Starter suporta 1000
  const overContacts = 1547 - 1000;
  const blocked = overContacts > 0;

  React.useEffect(() => {
    if (!open) return;
    setAck(false);
  }, [open]);

  const confirm = () => {
    toast({ title: "Downgrade agendado", description: "Downgrade agendado para 27/02/2026 (mock)." });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" /> Confirmar Downgrade
          </AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a fazer downgrade de Pro para Starter. Você perderá acesso a:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Integrações externas (Zapier, etc)</li>
          <li>API de acesso</li>
          <li>Webhooks</li>
          <li>Pagamento Pix</li>
          <li>4 membros da equipe (manterá apenas 1)</li>
          <li>7 ZapFllow ativas (manterá apenas 3)</li>
        </ul>

        <div className="mt-3 rounded-lg border p-3 text-sm">
          <div className="font-medium">⚠️ Limite de contatos</div>
          <div className="mt-1 text-muted-foreground">
            Você tem 1.547 contatos, mas o plano Starter suporta apenas 1.000. Você precisará remover {overContacts} contatos
            ou não poderá fazer downgrade.
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <Checkbox checked={ack} onCheckedChange={(v) => setAck(Boolean(v))} />
          Entendo que perderei acesso a esses recursos
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              if (blocked || !ack) {
                e.preventDefault();
                return;
              }
              confirm();
            }}
            className={blocked || !ack ? "pointer-events-none opacity-50" : ""}
          >
            Confirmar Downgrade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
