import * as React from "react";
import { Check, Crown } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().trim().min(3, "Informe seu nome").max(80, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(8, "Telefone inválido").max(30),
  company: z.string().trim().min(2, "Informe a empresa").max(120),
  contacts: z.enum(["10k-50k", "50k-100k", "100k+"], { required_error: "Selecione um volume" }),
  notes: z.string().trim().max(1000, "Máx. 1000 caracteres").optional(),
});

export function UpgradeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    contacts: "" as any,
    notes: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setLoading(false);
    setForm({ name: "", email: "", phone: "", company: "", contacts: "", notes: "" } as any);
  }, [open]);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Verifique os campos", description: parsed.error.issues[0]?.message });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    setLoading(false);
    toast({ title: "✅ Solicitação enviada!", description: "Entraremos em contato em até 24h. (mock)" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> Fazer Upgrade para Enterprise
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Desbloqueie todos os recursos</div>
            <div className="mt-2 grid gap-2 text-sm">
              {[
                "Contatos e usuários ilimitados",
                "White-label com sua marca",
                "Gerente de conta dedicado",
                "SLA 99.9% garantido",
                "Infraestrutura dedicada",
              ].map((b) => (
                <div key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <Badge variant="outline">Plano personalizado</Badge> Nossa equipe entrará em contato para entender suas necessidades.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="voce@empresa.com"
                type="email"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Nome da empresa" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Número de contatos esperado</Label>
            <Select value={form.contacts} onValueChange={(v) => setForm((p) => ({ ...p, contacts: v as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10k-50k">10k-50k</SelectItem>
                <SelectItem value="50k-100k">50k-100k</SelectItem>
                <SelectItem value="100k+">100k+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Conte-nos sobre suas necessidades</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Ex: múltiplos números WA, SLA, integrações..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={loading} onClick={submit}>
            {loading ? "Enviando..." : "Solicitar Contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
