import * as React from "react";
import { Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBytes } from "@/lib/format";
import { mediaChartColors } from "@/components/analytics/media/chart-colors";

export function StorageQuotaChart(props: { usedBytes: number; maxBytes: number }) {
  const used = Math.max(0, props.usedBytes);
  const max = Math.max(1, props.maxBytes);
  const remaining = Math.max(0, max - used);

  const data = React.useMemo(
    () => [
      { key: "used", name: "Usado", value: used, fill: "var(--color-used)" },
      { key: "remaining", name: "Restante", value: remaining, fill: "var(--color-remaining)" },
    ],
    [used, remaining],
  );

  return (
    <ChartContainer
      className="h-[240px] w-full"
      config={{
        used: { label: "Usado", color: mediaChartColors.used },
        remaining: { label: "Restante", color: mediaChartColors.remaining },
      }}
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{String(name)}</span>
                  <span className="font-mono font-medium tabular-nums">{formatBytes(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          stroke="hsl(var(--border))"
          strokeWidth={1}
          isAnimationActive={false}
        />
      </PieChart>
    </ChartContainer>
  );
}
