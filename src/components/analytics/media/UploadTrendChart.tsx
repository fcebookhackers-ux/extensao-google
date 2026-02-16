import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBytes } from "@/lib/format";
import { mediaChartColors } from "@/components/analytics/media/chart-colors";
import type { MediaUploadTrend } from "@/types/media-analytics";

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

export function UploadTrendChart(props: { trend: MediaUploadTrend[] }) {
  const data = React.useMemo(
    () =>
      (props.trend ?? []).map((d) => ({
        ...d,
        label: formatDateLabel(d.uploadDate),
      })),
    [props.trend],
  );

  return (
    <ChartContainer
      className="h-[260px] w-full"
      config={{
        totalSizeBytes: { label: "Total (bytes)", color: mediaChartColors.used },
      }}
    >
      <AreaChart data={data} margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v) => formatBytes(Number(v), 0)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="label"
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">Upload (dia)</span>
                  <span className="font-mono font-medium tabular-nums">{formatBytes(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="totalSizeBytes"
          stroke="var(--color-totalSizeBytes)"
          fill="var(--color-totalSizeBytes)"
          fillOpacity={0.18}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
