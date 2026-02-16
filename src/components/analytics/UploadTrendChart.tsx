import * as React from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { MediaUploadTrend } from "@/types/media-analytics";
import { formatBytes } from "@/lib/format";

interface UploadTrendChartProps {
  data: MediaUploadTrend[];
}

export function UploadTrendChart({ data }: UploadTrendChartProps) {
  if (!data || data.length === 0) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Nenhum dado de upload disponível</div>;
  }

  const chartData = data.map((item) => ({
    date: format(new Date(item.uploadDate), "dd/MM", { locale: ptBR }),
    count: item.fileCount,
    sizeBytes: item.totalSizeBytes,
    images: item.images,
    videos: item.videos,
    documents: item.documents,
    audio: item.audio,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" tickFormatter={(v) => Number(v).toLocaleString()} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatBytes(Number(v), 0)} />
          <Tooltip
            formatter={(value: any, name: any) => {
              if (name === "sizeBytes") return [formatBytes(Number(value)), "Tamanho"];
              if (name === "count") return [Number(value).toLocaleString(), "Arquivos"];
              return [value, String(name)];
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="count"
            name="Arquivos"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="sizeBytes"
            name="Tamanho"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
