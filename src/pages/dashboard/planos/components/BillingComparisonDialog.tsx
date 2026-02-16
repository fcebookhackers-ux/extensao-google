import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Row = { feature: string; starter: string; pro: string; enterprise: string };

const rows: Row[] = [
  { feature: "Contatos", starter: "1.000", pro: "10.000", enterprise: "Ilimitado" },
  { feature: "ZapFllow", starter: "3", pro: "∞", enterprise: "∞" },
  { feature: "Usuários", starter: "1", pro: "5", enterprise: "∞" },
  { feature: "Templates", starter: "Básico", pro: "Avançado", enterprise: "Personalizado" },
  { feature: "Suporte", starter: "Email", pro: "Chat+WA", enterprise: "24/7 + Dedicado" },
  { feature: "API", starter: "❌", pro: "✅", enterprise: "✅" },
  { feature: "Webhooks", starter: "❌", pro: "✅", enterprise: "✅" },
  { feature: "Integrações", starter: "❌", pro: "✅", enterprise: "✅" },
  { feature: "PIX", starter: "❌", pro: "✅", enterprise: "✅" },
  { feature: "Multi-WhatsApp", starter: "❌", pro: "❌", enterprise: "✅" },
  { feature: "White-label", starter: "❌", pro: "❌", enterprise: "✅" },
  { feature: "SLA", starter: "❌", pro: "❌", enterprise: "99.9%" },
  { feature: "Relatórios", starter: "Básico", pro: "Avançado", enterprise: "Personalizado" },
];

export function BillingComparisonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Comparação Detalhada de Recursos</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-auto rounded-lg border">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background">Recurso</TableHead>
                <TableHead>Starter</TableHead>
                <TableHead>Pro</TableHead>
                <TableHead>Enterprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.feature}>
                  <TableCell className={cn("sticky left-0 z-10 bg-background font-medium", "border-r")}>{r.feature}</TableCell>
                  <TableCell>{r.starter}</TableCell>
                  <TableCell>{r.pro}</TableCell>
                  <TableCell>{r.enterprise}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
