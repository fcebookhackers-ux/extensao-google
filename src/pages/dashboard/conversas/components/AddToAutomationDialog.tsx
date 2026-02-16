import * as React from "react";
import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const automations = [
  { id: "a1", name: "Boas-vindas" },
  { id: "a2", name: "Lembrete de pagamento" },
  { id: "a3", name: "Reativação" },
];

export function AddToAutomationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [automationId, setAutomationId] = React.useState(automations[0]!.id);
  const [pauseHuman, setPauseHuman] = React.useState(false);

  const submit = () => {
    toast({ title: "Contato adicionado ao ZapFllow", description: "🤖 Bot assumiu (mock)." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Adicionar ao ZapFllow
          </DialogTitle>
          <DialogDescription>O contato entrará no fluxo imediatamente (mock).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Escolha um ZapFllow</div>
            <Select value={automationId} onValueChange={setAutomationId}>
              <SelectTrigger>
                <SelectValue placeholder="ZapFllow" />
              </SelectTrigger>
              <SelectContent>
                {automations.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2">
            <Checkbox checked={pauseHuman} onCheckedChange={(v) => setPauseHuman(!!v)} />
            <span className="text-sm">Pausar atendimento humano durante ZapFllow</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
