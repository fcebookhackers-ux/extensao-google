import * as React from "react";
import { Copy, Gift, Mail, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export function ReferralProgramCard() {
  const link = "https://app.zapfllow.com/ref/joao123";
  const stats = { sent: 3, converted: 1, credits: "R$ 197,00", next: 2 };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copiado", description: link });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Copie manualmente o link." });
    }
  };

  const shareWhatsApp = () => {
    const msg = `Use meu link de indicação: ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("Indicação - 1 mês grátis");
    const body = encodeURIComponent(`Use meu link de indicação: ${link}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5 text-primary" /> Indique e Ganhe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Indique amigos e ganhe 1 mês grátis para cada indicação que assinar um plano pago!
        </p>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Seu link de indicação</div>
          <div className="flex gap-2">
            <Input readOnly value={link} />
            <Button variant="outline" className="gap-2" onClick={copy}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Indicações enviadas</span>
            <span className="font-medium tabular-nums">{stats.sent}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Indicações convertidas</span>
            <span className="font-medium tabular-nums">{stats.converted}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Créditos ganhos</span>
            <span className="font-medium tabular-nums">{stats.credits}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Próxima recompensa em</span>
            <span className="font-medium tabular-nums">{stats.next} indicações</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="gap-2" onClick={shareWhatsApp}>
            <Share2 className="h-4 w-4" /> Compartilhar no WhatsApp
          </Button>
          <Button variant="outline" className="gap-2" onClick={shareEmail}>
            <Mail className="h-4 w-4" /> Compartilhar no Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
