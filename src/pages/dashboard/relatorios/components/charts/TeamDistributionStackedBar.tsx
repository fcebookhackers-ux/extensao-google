import * as React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { teamMock } from "@/pages/dashboard/relatorios/mockData";

export function TeamDistributionStackedBar() {
  const data = teamMock.rows.map((r) => ({
    name: r.name.split(" ")[0],
    resolvidas: r.dist.resolved,
    abertas: r.dist.open,
    transferidas: r.dist.transferred,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição de Conversas por Membro</CardTitle>
        <div className="text-sm text-muted-foreground">Resolvidas, abertas e transferidas</div>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Bar dataKey="resolvidas" name="Resolvidas" stackId="a" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="abertas" name="Abertas" stackId="a" fill="hsl(var(--secondary))" />
            <Bar dataKey="transferidas" name="Transferidas" stackId="a" fill="hsl(var(--accent))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
