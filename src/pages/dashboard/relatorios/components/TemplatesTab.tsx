import * as React from "react";
import { ArrowDown, ArrowUp, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { templatesMock, type TemplateRow } from "@/pages/dashboard/relatorios/mockData";

type SortKey = keyof Pick<
  TemplateRow,
  "name" | "category" | "status" | "sent" | "deliveryRatePct" | "readRatePct" | "buttonClicks" | "conversions"
>;

function compare(a: TemplateRow, b: TemplateRow, key: SortKey) {
  const av = a[key];
  const bv = b[key];
  const aNum = typeof av === "number" ? av : av == null ? -Infinity : NaN;
  const bNum = typeof bv === "number" ? bv : bv == null ? -Infinity : NaN;
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

function StatusBadge({ status }: { status: TemplateRow["status"] }) {
  if (status === "Aprovado") return <Badge>Aprovado</Badge>;
  if (status === "Pendente") return <Badge variant="outline">Pendente</Badge>;
  return <Badge variant="destructive">Rejeitado</Badge>;
}

export function TemplatesTab() {
  const [category, setCategory] = React.useState<"all" | TemplateRow["category"]>("all");
  const [status, setStatus] = React.useState<"all" | TemplateRow["status"]>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "sent", dir: "desc" });

  const rows = React.useMemo(() => {
    let data = [...templatesMock.rows];
    if (category !== "all") data = data.filter((r) => r.category === category);
    if (status !== "all") data = data.filter((r) => r.status === status);
    data.sort((a, b) => {
      const d = compare(a, b, sort.key);
      return sort.dir === "asc" ? d : -d;
    });
    return data;
  }, [category, status, sort]);

  const headerBtn = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === key;
    const Icon = !active ? null : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        className={cn(
          "inline-flex w-full items-center gap-1 text-left",
          align === "right" && "justify-end",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() =>
          setSort((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }))
        }
      >
        {label}
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      </button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-base">Templates</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">Métricas por template (mock)</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[200px]">
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4 opacity-70" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Utilidade">Utilidade</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Suporte">Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[190px]">
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4 opacity-70" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{headerBtn("name", "Nome do Template")}</TableHead>
              <TableHead>{headerBtn("category", "Categoria")}</TableHead>
              <TableHead>{headerBtn("status", "Status")}</TableHead>
              <TableHead className="text-right">{headerBtn("sent", "Enviados", "right")}</TableHead>
              <TableHead className="text-right">{headerBtn("deliveryRatePct", "Entrega", "right")}</TableHead>
              <TableHead className="text-right">{headerBtn("readRatePct", "Leitura", "right")}</TableHead>
              <TableHead className="text-right">{headerBtn("buttonClicks", "Cliques", "right")}</TableHead>
              <TableHead className="text-right">{headerBtn("conversions", "Conversões", "right")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.name}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.sent.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{r.deliveryRatePct ? `${r.deliveryRatePct}%` : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.readRatePct ? `${r.readRatePct}%` : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.buttonClicks == null ? "—" : r.buttonClicks.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{r.conversions == null ? "—" : r.conversions.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
