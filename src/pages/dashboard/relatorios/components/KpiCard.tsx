import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function useCountUp(target: number, durationMs = 650) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function Sparkline({ data }: { data: readonly number[] }) {
  const w = 86;
  const h = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);

  const points = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-primary">
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.9}
      />
    </svg>
  );
}

export function KpiCard({
  icon: Icon,
  iconClassName,
  value,
  valueSuffix,
  label,
  deltaLabel,
  deltaDirection,
  sparkline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  value: number;
  valueSuffix?: string;
  label: string;
  deltaLabel: string;
  deltaDirection: "up" | "down";
  sparkline: readonly number[];
}) {
  const animated = useCountUp(value);
  const DeltaIcon = deltaDirection === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className={cn("rounded-md bg-muted p-2", iconClassName)}>
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </div>
        <Sparkline data={sparkline} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{animated.toLocaleString()}{valueSuffix ?? ""}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        <div className={cn("mt-2 inline-flex items-center gap-1 text-sm", deltaDirection === "up" ? "text-primary" : "text-destructive")}>
          <DeltaIcon className="h-4 w-4" />
          {deltaLabel}
        </div>
      </CardContent>
    </Card>
  );
}
