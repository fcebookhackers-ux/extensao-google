import * as React from "react";
import { CreditCard, Lock } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  holder: z.string().trim().min(3, "Informe o nome").max(80),
  number: z
    .string()
    .trim()
    .min(12, "Número inválido")
    .max(23, "Número inválido")
    .regex(/^[0-9 ]+$/, "Use apenas números"),
  exp: z.string().trim().regex(/^\d{2}\/\d{2}$/, "Use MM/YY"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "CVC inválido"),
});

export function PaymentMethodDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = React.useState(false);
  const [holder, setHolder] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [cvc, setCvc] = React.useState("");
  const [saveCard, setSaveCard] = React.useState(true);
  const [makeDefault, setMakeDefault] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setLoading(false);
    setHolder("");
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setSaveCard(true);
    setMakeDefault(true);
  }, [open]);

  const save = async () => {
    const parsed = schema.safeParse({ holder, number: cardNumber, exp: expiry, cvc });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.issues[0]?.message ?? "Verifique os campos." });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    toast({
      title: "✅ Cartão adicionado com sucesso!",
      description: `Salvar: ${saveCard ? "sim" : "não"} • Padrão: ${makeDefault ? "sim" : "não"} (mock)`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Adicionar Cartão de Crédito
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Stripe Elements</div>
            <div className="mt-1">Área do iframe do Stripe (mock) — inputs abaixo simulam validação em tempo real.</div>
          </div>

          <div className="space-y-2">
            <Label>Card Holder Name</Label>
            <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nome como está no cartão" />
          </div>

          <div className="space-y-2">
            <Label>Card Number</Label>
            <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" />
            <div className="text-xs text-muted-foreground">Bandeiras: Visa, Mastercard, Amex (detecção mock)</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" />
            </div>
            <div className="space-y-2">
              <Label>CVC</Label>
              <Input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="123" inputMode="numeric" />
              <div className="text-xs text-muted-foreground">3-4 dígitos</div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={saveCard} onCheckedChange={(v) => setSaveCard(Boolean(v))} />
            Salvar este cartão para pagamentos futuros
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(Boolean(v))} />
            Definir como método padrão
          </label>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <div className="inline-flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-primary" /> Pagamento 100% Seguro
            </div>
            <Badge variant="outline">SSL Verified</Badge>
            <Badge variant="outline">PCI Compliant</Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={loading} onClick={save}>
            {loading ? "Adicionando..." : "Adicionar Cartão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
