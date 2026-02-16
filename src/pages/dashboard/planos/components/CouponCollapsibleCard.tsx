import * as React from "react";
import { ChevronDown, TicketPercent, X } from "lucide-react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const couponSchema = z
  .string()
  .trim()
  .min(3, "Informe um código")
  .max(32, "Código muito longo")
  .regex(/^[A-Z0-9_-]+$/i, "Use apenas letras, números, _ e -");

const validCoupons = new Map<string, { pct: number; until: string }>([["PROMO20", { pct: 20, until: "31/01/2026" }]]);

export function CouponCollapsibleCard() {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [active, setActive] = React.useState<Array<{ code: string; pct: number; until: string }>>([
    { code: "PROMO20", pct: 20, until: "31/01/2026" },
  ]);

  const apply = () => {
    const parsed = couponSchema.safeParse(code);
    if (!parsed.success) {
      toast({ title: "Cupom inválido", description: parsed.error.issues[0]?.message ?? "Verifique o código." });
      return;
    }

    const normalized = parsed.data.toUpperCase();
    const found = validCoupons.get(normalized);
    if (!found) {
      toast({ title: "❌ Cupom inválido ou expirado", description: "Tente outro código." });
      return;
    }

    if (active.some((a) => a.code === normalized)) {
      toast({ title: "Cupom já aplicado", description: normalized });
      return;
    }

    setActive((p) => [{ code: normalized, pct: found.pct, until: found.until }, ...p]);
    setCode("");
    toast({ title: "✅ Cupom aplicado!", description: `Cupom ${normalized} aplicado (mock).` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cupons e Promoções</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="inline-flex items-center gap-2">
                <TicketPercent className="h-4 w-4" /> Tem um Cupom?
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código do cupom" />
              <Button onClick={apply}>Aplicar</Button>
            </div>
            <Alert>
              <AlertTitle>Economia (mock)</AlertTitle>
              <AlertDescription>Se válido, você verá o desconto aplicado no próximo pagamento.</AlertDescription>
            </Alert>
          </CollapsibleContent>
        </Collapsible>

        {active.length ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Cupons ativos</div>
            {active.map((c) => (
              <div key={c.code} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="text-sm">
                  <div className="font-medium">
                    {c.code} <span className="text-muted-foreground">- {c.pct}% OFF</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Válido até {c.until}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Ativo</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setActive((p) => p.filter((x) => x.code !== c.code));
                      toast({ title: "Cupom removido", description: c.code });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
