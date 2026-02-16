import * as React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conversationsMock } from "@/pages/dashboard/relatorios/mockData";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
];

export function ConversationsStatusPie() {
  const data = React.useMemo(() => [...conversationsMock.statusBreakdown], []);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conversas por Status</CardTitle>
        <div className="text-sm text-muted-foreground">Distribuição no período (mock)</div>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
