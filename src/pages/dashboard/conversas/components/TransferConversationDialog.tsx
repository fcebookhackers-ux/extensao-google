import * as React from "react";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const members = [
  { id: "me", name: "João Silva", initials: "JS", online: true },
  { id: "ms", name: "Maria Santos", initials: "MS", online: true },
  { id: "co", name: "Carlos Oliveira", initials: "CO", online: false },
];

export function TransferConversationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [to, setTo] = React.useState("ms");
  const [msg, setMsg] = React.useState("");
  const [notifyWa, setNotifyWa] = React.useState(true);
  const [notifyEmail, setNotifyEmail] = React.useState(false);

  const submit = () => {
    toast({ title: "Conversa transferida com sucesso" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Transferir Conversa
          </DialogTitle>
          <DialogDescription>Escolha o novo atendente e, se quiser, deixe uma mensagem (mock).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Transferir para</div>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger>
                <SelectValue placeholder="Membro" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{m.initials}</AvatarFallback>
                      </Avatar>
                      <span>{m.name}</span>
                      <span className="text-xs text-muted-foreground">({m.online ? "online" : "offline"})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Mensagem para o novo atendente (opcional)</div>
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex: Cliente precisa de informação técnica" />
          </div>

          <div className="grid gap-2">
            <label className="flex items-center gap-2">
              <Checkbox checked={notifyWa} onCheckedChange={(v) => setNotifyWa(!!v)} />
              <span className="text-sm">Notificar via WhatsApp</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={notifyEmail} onCheckedChange={(v) => setNotifyEmail(!!v)} />
              <span className="text-sm">Notificar via Email</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Transferir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
