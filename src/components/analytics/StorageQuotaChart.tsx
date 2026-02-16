import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";

interface StorageQuotaChartProps {
  used: number;
  max: number;
}

function clampPercent(p: number) {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

export function StorageQuotaChart({ used, max }: StorageQuotaChartProps) {
  const safeMax = Math.max(1, max);
  const safeUsed = Math.max(0, used);
  const percentage = clampPercent((safeUsed / safeMax) * 100);
  const remaining = Math.max(0, safeMax - safeUsed);

  const getBarClass = (pct: number) => {
    if (pct >= 95) return "bg-destructive";
    if (pct >= 80) return "bg-secondary";
    if (pct >= 60) return "bg-primary";
    return "bg-primary";
  };

  return (
    <div className="space-y-4">
      {/* Barra de progresso */}
      <div className="space-y-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width]", getBarClass(percentage))}
            style={{ width: `${percentage}%` }}
            aria-hidden
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{percentage.toFixed(1)}%</span>
          <span>
            {formatBytes(safeUsed)} / {formatBytes(safeMax)}
          </span>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-3 rounded-lg border bg-card p-4 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Usado</div>
          <div className="font-medium">{formatBytes(safeUsed)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Disponível</div>
          <div className="font-medium">{formatBytes(remaining)}</div>
        </div>
      </div>

      {/* Avisos */}
      {percentage >= 95 && (
        <Alert variant="destructive">
          <AlertTitle>Storage quase cheio</AlertTitle>
          <AlertDescription>
            Você está acima de 95% da quota. Considere excluir arquivos antigos/maiores ou solicitar aumento de quota.
          </AlertDescription>
        </Alert>
      )}

      {percentage >= 80 && percentage < 95 && (
        <Alert>
          <AlertTitle>Atenção ao uso de storage</AlertTitle>
          <AlertDescription>Você está usando mais de 80% da sua quota.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
