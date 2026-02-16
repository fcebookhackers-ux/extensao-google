import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { dia: "Seg", mensagens: 380 },
  { dia: "Ter", mensagens: 420 },
  { dia: "Qua", mensagens: 410 },
  { dia: "Qui", mensagens: 460 },
  { dia: "Sex", mensagens: 520 },
  { dia: "Sáb", mensagens: 300 },
  { dia: "Dom", mensagens: 260 },
];

export function WeekdayMessagesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mensagens por Dia da Semana</CardTitle>
        <div className="text-sm text-muted-foreground">Sexta-feira é seu dia mais movimentado</div>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="mensagens" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
