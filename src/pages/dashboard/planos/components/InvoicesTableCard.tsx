import * as React from "react";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";

type Invoice = {
  date: string;
  description: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  method: string;
};

const mockInvoices: Invoice[] = [
  { date: "27/01/2026", description: "Plano Pro - Janeiro/2026", amount: "R$ 197,00", status: "paid", method: "Visa ••4321" },
  { date: "27/12/2025", description: "Plano Pro - Dezembro/2025", amount: "R$ 197,00", status: "paid", method: "Visa ••4321" },
  { date: "27/11/2025", description: "Plano Pro - Novembro/2025", amount: "R$ 197,00", status: "paid", method: "Visa ••4321" },
  { date: "27/10/2025", description: "Plano Starter - Outubro/2025", amount: "R$ 79,00", status: "paid", method: "Visa ••4321" },
  { date: "20/10/2025", description: "Upgrade: Starter → Pro", amount: "R$ 118,00", status: "paid", method: "Visa ••4321" },
];

function downloadFakePdf(filename: string) {
  const content = `Nota Fiscal (mock)\n\nArquivo: ${filename}\nGerado em: ${new Date().toLocaleString("pt-BR")}`;
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  if (status === "paid") return <Badge className="gap-1">Pago ✅</Badge>;
  if (status === "pending") return <Badge variant="outline">Pendente</Badge>;
  return <Badge variant="destructive">Falhou</Badge>;
}

export function InvoicesTableCard({ methodLabel }: { methodLabel: string }) {
  const pageSize = 10;
  const [page, setPage] = React.useState(1);

  const invoices = React.useMemo(() => mockInvoices.map((i) => ({ ...i, method: methodLabel })), [methodLabel]);
  const totalPages = Math.max(1, Math.ceil(invoices.length / pageSize));
  const clampedPage = Math.min(totalPages, Math.max(1, page));
  const slice = invoices.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
        <div className="text-sm text-muted-foreground">Últimas transações</div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((inv) => (
              <TableRow key={`${inv.date}-${inv.description}`}>
                <TableCell className="tabular-nums">{inv.date}</TableCell>
                <TableCell className="font-medium">{inv.description}</TableCell>
                <TableCell className="text-right tabular-nums">{inv.amount}</TableCell>
                <TableCell>
                  <StatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{inv.method}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const name = `nota-fiscal-${inv.date.replace(/\//g, "-")}.pdf`;
                      downloadFakePdf(name);
                      toast({ title: "Download iniciado", description: "Nota fiscal (mock) em PDF." });
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
                className={clampedPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                isActive
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                {clampedPage}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                className={clampedPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardContent>
    </Card>
  );
}
