import * as React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatBytes } from "@/lib/format";

interface TypeDistributionChartProps {
  byType: {
    image: { count: number; sizeBytes: number };
    video: { count: number; sizeBytes: number };
    document: { count: number; sizeBytes: number };
    audio: { count: number; sizeBytes: number };
  };
}

const TYPE_COLOR: Record<string, string> = {
  image: "hsl(var(--brand-primary-light))",
  video: "hsl(var(--secondary))",
  document: "hsl(var(--accent))",
  audio: "hsl(var(--ring))",
};

const TYPE_LABEL: Record<string, string> = {
  image: "Imagens",
  video: "Vídeos",
  document: "Documentos",
  audio: "Áudio",
};

export function TypeDistributionChart({ byType }: TypeDistributionChartProps) {
  const data = React.useMemo(
    () =>
      Object.entries(byType)
        .filter(([_, stats]) => (stats?.count ?? 0) > 0)
        .map(([type, stats]) => ({
          type,
          name: TYPE_LABEL[type] ?? type,
          value: stats.sizeBytes,
          count: stats.count,
          color: TYPE_COLOR[type] ?? "hsl(var(--muted-foreground))",
        })),
    [byType],
  );

  if (data.length === 0) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Nenhum arquivo na biblioteca</div>;
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={90}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`${entry.type}-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, _name: any, payload: any) => {
              const count = payload?.payload?.count ?? 0;
              return [`${formatBytes(Number(value))} • ${Number(count).toLocaleString()} arq.`, "Tamanho"];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
