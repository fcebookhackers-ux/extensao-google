import * as React from "react";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

export function SalesContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setCompany("");
    setNotes("");
  }, [open]);

  const submit = () => {
    toast({ title: "Contato enviado", description: `Vendas entrará em contato (mock). Email: ${email || "—"}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Falar com Vendas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" type="email" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-2">
            <Label>O que você precisa?</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: múltiplos números WhatsApp, SLA, onboarding..." />
          </div>
          <div className="text-xs text-muted-foreground">* Envio mock (sem integração real).</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
