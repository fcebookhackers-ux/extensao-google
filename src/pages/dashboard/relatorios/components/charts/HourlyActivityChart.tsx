import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { h: "0h", v: 12 },
  { h: "3h", v: 8 },
  { h: "6h", v: 20 },
  { h: "9h", v: 54 },
  { h: "12h", v: 68 },
  { h: "15h", v: 92 },
  { h: "18h", v: 74 },
  { h: "21h", v: 40 },
];

export function HourlyActivityChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mensagens por Horário</CardTitle>
        <div className="text-sm text-muted-foreground">Pico de atividade às 14h–16h</div>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis dataKey="h" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="v" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
