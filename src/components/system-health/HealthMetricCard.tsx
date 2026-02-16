import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemStatusIndicator, type SystemStatus } from "@/components/system-health/SystemStatusIndicator";

type SparkPoint = {
  label: string;
  value: number;
};

function defaultFormatter(v: number) {
  if (Number.isNaN(v)) return "—";
  return v.toFixed(1);
}

export function HealthMetricCard({
  title,
  value,
  subtitle,
  status,
  sparkline,
  valueFormatter = defaultFormatter,
}: {
  title: string;
  value: number;
  subtitle?: string;
  status: SystemStatus;
  sparkline: SparkPoint[];
  valueFormatter?: (v: number) => string;
}) {
  const formatted = useMemo(() => valueFormatter(value), [value, valueFormatter]);

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <SystemStatusIndicator status={status} />
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={formatted}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="text-2xl font-semibold tracking-tight"
              >
                {formatted}
              </motion.div>
            </AnimatePresence>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="h-14">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--popover-foreground))",
                  borderRadius: 10,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(v: any) => [valueFormatter(Number(v)), title]}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
