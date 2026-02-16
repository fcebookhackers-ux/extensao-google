import * as React from "react";
import { CreditCard, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export function PaymentMethodsCard({ onManage }: { onManage: () => void }) {
  const [removed, setRemoved] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Métodos de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!removed ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-muted p-2">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">Visa</div>
                    <Badge className="bg-primary text-primary-foreground">Padrão</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">•••• •••• •••• 4321</div>
                  <div className="mt-1 text-xs text-muted-foreground">JOÃO DA SILVA • 12/2027</div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={onManage}>
                  Alterar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setRemoved(true);
                    toast({ title: "Cartão removido", description: "Remoção registrada (mock)." });
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum método salvo.</div>
        )}

        <Button variant="outline" className="w-full" onClick={onManage}>
          + Adicionar Método de Pagamento
        </Button>
      </CardContent>
    </Card>
  );
}
