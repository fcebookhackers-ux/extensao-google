import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conversationsMock } from "@/pages/dashboard/relatorios/mockData";

export function ConversationOriginsBar() {
  const data = conversationsMock.origins.map((o) => ({ name: o.name, value: o.pct }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como os Clientes Entraram em Contato</CardTitle>
        <div className="text-sm text-muted-foreground">Origem das conversas (%)</div>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 18, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              formatter={(v: any) => [`${v}%`, "Participação"]}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
