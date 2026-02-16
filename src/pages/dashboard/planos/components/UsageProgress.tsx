import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatBr(n: number) {
  return n.toLocaleString("pt-BR");
}

function pct(used: number, limit: number | null) {
  if (!limit) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function levelFromPct(p: number) {
  if (p > 95) return "danger" as const;
  if (p >= 80) return "warn" as const;
  return "ok" as const;
}

export function UsageProgress({
  label,
  used,
  limit,
  helper,
}: {
  label: string;
  used: number;
  limit: number | null;
  helper?: React.ReactNode;
}) {
  const p = pct(used, limit);
  const level = levelFromPct(p);

  const barClass =
    level === "ok"
      ? "bg-primary"
      : level === "warn"
        ? "bg-accent"
        : "bg-destructive";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm text-muted-foreground tabular-nums">
          {limit ? (
            `${formatBr(used)} / ${formatBr(limit)} (${p}%)`
          ) : (
            <span className="inline-flex items-center gap-2">
              {formatBr(used)} / <Badge>Ilimitado</Badge>
            </span>
          )}
        </div>
      </div>

      {limit ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-2 rounded-full transition-all", barClass)} style={{ width: `${p}%` }} />
        </div>
      ) : null}

      {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  );
}
