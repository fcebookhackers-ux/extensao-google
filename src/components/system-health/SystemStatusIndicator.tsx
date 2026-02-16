import { cn } from "@/lib/utils";

export type SystemStatus = "healthy" | "warning" | "critical";

const label: Record<SystemStatus, string> = {
  healthy: "Saudável",
  warning: "Atenção",
  critical: "Crítico",
};

export function SystemStatusIndicator({
  status,
  className,
}: {
  status: SystemStatus;
  className?: string;
}) {
  // Sem cores hardcoded: usamos tokens semânticos via utility classes.
  // (bg-success/bg-warning/bg-destructive normalmente são tokens do tema)
  const dotClass =
    status === "healthy"
      ? "bg-primary" // fallback semântico
      : status === "warning"
        ? "bg-accent"
        : "bg-destructive";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden="true" />
      <span className="text-sm text-muted-foreground">{label[status]}</span>
    </div>
  );
}
