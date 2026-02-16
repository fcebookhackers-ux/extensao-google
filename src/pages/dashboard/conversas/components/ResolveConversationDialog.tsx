import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

export function ResolveConversationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [sendNps, setSendNps] = React.useState(true);
  const [summary, setSummary] = React.useState("");

  const confirm = () => {
    toast({ title: "Conversa resolvida!", description: sendNps ? "Pesquisa de satisfação será enviada (mock)." : undefined });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Marcar Conversa como Resolvida?
          </AlertDialogTitle>
          <AlertDialogDescription>Você poderá reabrir a qualquer momento se necessário.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <Checkbox checked={sendNps} onCheckedChange={(v) => setSendNps(!!v)} />
            <span className="text-sm">Enviar pesquisa de satisfação</span>
          </label>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Resumo da resolução (opcional)</div>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Descreva brevemente a solução..." />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Sim, Resolver</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
