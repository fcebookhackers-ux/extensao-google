import { useQuotaUsage } from '@/hooks/useStorageQuota';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

export function StorageQuotaIndicator() {
  const quotaUsage = useQuotaUsage();

  if (!quotaUsage) return null;

  const { used, max, percentage, remaining } = quotaUsage;

  const getColorClass = (pct: number) => {
    if (pct >= 90) return 'text-destructive';
    if (pct >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-destructive';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const showWarning = percentage >= 80;
  const showCritical = percentage >= 95;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Armazenamento</span>
        </div>
        <span className={cn('text-sm font-medium', getColorClass(percentage))}>
          {formatBytes(used)} de {formatBytes(max)} ({percentage.toFixed(1)}%)
        </span>
      </div>

      <div className="relative">
        <Progress value={percentage} className="h-2" />
        <div
          className={cn(
            'absolute inset-0 h-2 rounded-full transition-all',
            getProgressColor(percentage)
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {showCritical && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você está usando mais de 95% do seu espaço disponível. Remova arquivos antigos
            para liberar espaço.
          </AlertDescription>
        </Alert>
      )}

      {showWarning && !showCritical && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você está usando mais de 80% do seu espaço. Considere remover arquivos que não
            usa mais.
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Restante: {formatBytes(remaining)}
      </p>
    </div>
  );
}
