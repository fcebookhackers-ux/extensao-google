import * as React from "react";
import { Pie, PieChart } from "recharts";

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBytes } from "@/lib/format";
import { mediaChartColors } from "@/components/analytics/media/chart-colors";

type Row = { key: "image" | "video" | "document" | "audio"; label: string; value: number; sizeBytes: number; fill: string };

export function TypeDistributionChart(props: {
  byType: {
    image: { count: number; sizeBytes: number };
    video: { count: number; sizeBytes: number };
    document: { count: number; sizeBytes: number };
    audio: { count: number; sizeBytes: number };
  };
}) {
  const data: Row[] = React.useMemo(
    () => [
      {
        key: "image",
        label: "Imagens",
        value: props.byType.image.count,
        sizeBytes: props.byType.image.sizeBytes,
        fill: "var(--color-image)",
      },
      {
        key: "video",
        label: "Vídeos",
        value: props.byType.video.count,
        sizeBytes: props.byType.video.sizeBytes,
        fill: "var(--color-video)",
      },
      {
        key: "document",
        label: "Documentos",
        value: props.byType.document.count,
        sizeBytes: props.byType.document.sizeBytes,
        fill: "var(--color-document)",
      },
      {
        key: "audio",
        label: "Áudio",
        value: props.byType.audio.count,
        sizeBytes: props.byType.audio.sizeBytes,
        fill: "var(--color-audio)",
      },
    ],
    [props.byType],
  );

  return (
    <ChartContainer
      className="h-[240px] w-full"
      config={{
        image: { label: "Imagens", color: mediaChartColors.image },
        video: { label: "Vídeos", color: mediaChartColors.video },
        document: { label: "Documentos", color: mediaChartColors.document },
        audio: { label: "Áudio", color: mediaChartColors.audio },
      }}
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="label"
              formatter={(value, _name, item) => {
                const payload = item?.payload as any;
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{payload?.label ?? ""}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {Number(value).toLocaleString()} ({formatBytes(Number(payload?.sizeBytes ?? 0))})
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={56}
          outerRadius={92}
          stroke="hsl(var(--border))"
          strokeWidth={1}
          isAnimationActive={false}
        />
        <ChartLegend content={<ChartLegendContent nameKey="label" />} />
      </PieChart>
    </ChartContainer>
  );
}
