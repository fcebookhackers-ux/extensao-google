import { cn } from "@/lib/utils";

export function CircularProgress({
  value,
  size = 84,
  stroke = 10,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-muted"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-brand-primary-light"
          fill="none"
          strokeLinecap="round"
          style={{ strokeDasharray: c, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-semibold">{clamped}%</div>
      </div>
    </div>
  );
}
