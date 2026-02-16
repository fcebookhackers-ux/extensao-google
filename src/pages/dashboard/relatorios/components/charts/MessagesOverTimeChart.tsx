import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const data = [
  { data: "20/01", enviadas: 387, recebidas: 312, taxa: 98 },
  { data: "21/01", enviadas: 423, recebidas: 356, taxa: 97 },
  { data: "22/01", enviadas: 391, recebidas: 328, taxa: 99 },
  { data: "23/01", enviadas: 452, recebidas: 341, taxa: 98 },
  { data: "24/01", enviadas: 476, recebidas: 389, taxa: 98 },
  { data: "25/01", enviadas: 498, recebidas: 402, taxa: 97 },
  { data: "26/01", enviadas: 520, recebidas: 420, taxa: 98 },
];

type ToggleKey = "enviadas" | "recebidas" | "taxa";

export function MessagesOverTimeChart() {
  const [enabled, setEnabled] = React.useState<Record<ToggleKey, boolean>>({
    enviadas: true,
    recebidas: true,
    taxa: true,
  });

  const chip = (key: ToggleKey, label: string) => (
    <button
      type="button"
      onClick={() => setEnabled((p) => ({ ...p, [key]: !p[key] }))}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        enabled[key] ? "bg-muted" : "bg-background text-muted-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-base">Mensagens ao Longo do Tempo</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">Enviadas vs. Recebidas</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {chip("enviadas", "Enviadas")}
            {chip("recebidas", "Recebidas")}
            {chip("taxa", "Taxa de Entrega")}
            <Badge variant="outline" className="ml-0 md:ml-2">Mock</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="recv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.22} />
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis dataKey="data" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />

            {enabled.enviadas ? (
              <Area
                type="monotone"
                dataKey="enviadas"
                name="Enviadas"
                stroke="hsl(var(--primary))"
                fill="url(#sent)"
                strokeWidth={2}
              />
            ) : null}
            {enabled.recebidas ? (
              <Area
                type="monotone"
                dataKey="recebidas"
                name="Recebidas"
                stroke="hsl(var(--secondary))"
                fill="url(#recv)"
                strokeWidth={2}
              />
            ) : null}
            {enabled.taxa ? (
              <Line
                type="monotone"
                dataKey="taxa"
                name="Taxa (%)"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 4"
                dot={false}
                yAxisId={0}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
