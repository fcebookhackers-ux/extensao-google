import * as React from "react";
import { ArrowDown, ArrowUp, Filter, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AutomationDetailsDialog } from "@/pages/dashboard/relatorios/components/AutomationDetailsDialog";
import { automationsMock, type AutomationRow } from "@/pages/dashboard/relatorios/mockData";
import { toast } from "@/components/ui/use-toast";

type SortKey = keyof Pick<
  AutomationRow,
  "name" | "status" | "shots" | "completionRatePct" | "avgCompletion" | "conversions" | "errorRatePct"
>;

function compare(a: AutomationRow, b: AutomationRow, key: SortKey) {
  const av = a[key];
  const bv = b[key];
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv));
}

function StatusBadge({ status }: { status: AutomationRow["status"] }) {
  return (
    <Badge variant={status === "active" ? "default" : "outline"}>
      {status === "active" ? "Ativo" : "Pausado"}
    </Badge>
  );
}

export function AutomationsTab() {
  const [statusFilter, setStatusFilter] = React.useState<"all" | AutomationRow["status"]>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "shots", dir: "desc" });
  const [q, setQ] = React.useState("");
  const qDebounced = useDebouncedValue(q, 250);

  const [detailsId, setDetailsId] = React.useState<string | null>(null);
  const detailsAutomation = automationsMock.rows.find((r) => r.id === detailsId) ?? null;
  const funnel = detailsId ? automationsMock.funnelById[detailsId] ?? automationsMock.funnelById["a1"] : [];

  const rows = React.useMemo(() => {
    let data = [...automationsMock.rows];
    if (statusFilter !== "all") data = data.filter((r) => r.status === statusFilter);
    if (qDebounced.trim()) {
      const s = qDebounced.trim().toLowerCase();
      data = data.filter((r) => r.name.toLowerCase().includes(s));
    }
    data.sort((a, b) => {
      const d = compare(a, b, sort.key);
      return sort.dir === "asc" ? d : -d;
    });
    return data;
  }, [statusFilter, sort, qDebounced]);

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
          setSort((p) =>
            p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
          )
        }
      >
        {label}
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">Tabela ZapFllow</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">Disparos e desempenho no período selecionado (mock)</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ZapFllow..." className="pl-8" />
              </div>
              <div className="w-[190px]">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4 opacity-70" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
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
                <TableHead>{headerBtn("name", "Nome do ZapFllow")}</TableHead>
                <TableHead>{headerBtn("status", "Status")}</TableHead>
                <TableHead className="text-right">{headerBtn("shots", "Disparos", "right")}</TableHead>
                <TableHead className="text-right">{headerBtn("completionRatePct", "Conclusão", "right")}</TableHead>
                <TableHead className="text-right">{headerBtn("avgCompletion", "Tempo Médio", "right")}</TableHead>
                <TableHead className="text-right">{headerBtn("conversions", "Conversões", "right")}</TableHead>
                <TableHead className="text-right">{headerBtn("errorRatePct", "Erro", "right")}</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.shots.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.completionRatePct}%</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avgCompletion}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.conversions.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.errorRatePct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetailsId(r.id)}>
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AutomationDetailsDialog
        open={!!detailsId}
        onOpenChange={(v) => setDetailsId(v ? detailsId : null)}
        automation={detailsAutomation}
        funnel={funnel}
        onEdit={() => {
          toast({ title: "Editar ZapFllow", description: "Abrir editor (mock)" });
          setDetailsId(null);
        }}
      />
    </div>
  );
}
