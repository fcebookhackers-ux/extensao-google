import * as React from "react";
import { Area, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conversationsMock } from "@/pages/dashboard/relatorios/mockData";

export function ConversationsVolumeChart() {
  const data = React.useMemo(() => [...conversationsMock.volume], []);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volume de Conversas</CardTitle>
        <div className="text-sm text-muted-foreground">Novas, resolvidas e abertas</div>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
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
            />
            <Area type="monotone" dataKey="novas" name="Novas" stroke="hsl(var(--primary))" fill="url(#convFill)" strokeWidth={2} />
            <Line type="monotone" dataKey="resolvidas" name="Resolvidas" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="abertas" name="Abertas" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
