import { useCircuitBreakerStatus } from '@/hooks/useCircuitBreaker';
import type { CircuitBreakerState } from '@/types/circuit-breaker';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CircuitBreakerIndicatorProps {
  webhookId: string;
  compact?: boolean;
}

export function CircuitBreakerIndicator({ 
  webhookId, 
  compact = false 
}: CircuitBreakerIndicatorProps) {
  const { data: breaker, isLoading } = useCircuitBreakerStatus(webhookId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (!breaker) {
    return (
      <Badge variant="outline" className="gap-1">
        <Activity className="h-3 w-3" />
        Inicializando
      </Badge>
    );
  }

  const getStateConfig = (state: CircuitBreakerState) => {
    switch (state) {
      case 'closed':
        return {
          label: 'Funcionando',
          description: 'Circuit breaker fechado - webhook operando normalmente',
          icon: CheckCircle2,
          badgeVariant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'open':
        return {
          label: 'Bloqueado',
          description: 'Circuit breaker aberto - webhook temporariamente bloqueado devido a falhas',
          icon: XCircle,
          badgeVariant: 'destructive' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case 'half_open':
        return {
          label: 'Testando',
          description: 'Circuit breaker em teste - verificando se o endpoint recuperou',
          icon: AlertTriangle,
          badgeVariant: 'secondary' as const,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
    }
  };

  const config = getStateConfig(breaker.state);
  const Icon = config.icon;

  // Calcular tempo até próxima tentativa (se OPEN)
  const getTimeUntilRetry = () => {
    if (breaker.state !== 'open' || !breaker.opened_at) return null;
    
    const openedAt = new Date(breaker.opened_at);
    const retryAt = new Date(openedAt.getTime() + 300 * 1000); // 5 minutos
    const now = new Date();
    
    if (retryAt <= now) return 'Em breve';
    
    return formatDistanceToNow(retryAt, { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  if (compact) {
    return (
      <Badge variant={config.badgeVariant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  return (
    <Alert className={cn(config.bgColor, config.borderColor)}>
      <Icon className={cn('h-4 w-4', config.color)} />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <p className="font-medium">{config.label}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Falhas consecutivas:</span>
              <span className="ml-2 font-medium">{breaker.consecutive_failures}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total de falhas:</span>
              <span className="ml-2 font-medium">{breaker.failure_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sucessos consecutivos:</span>
              <span className="ml-2 font-medium">{breaker.consecutive_successes}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total de sucessos:</span>
              <span className="ml-2 font-medium">{breaker.success_count}</span>
            </div>
          </div>

          {/* Última atividade */}
          {breaker.last_failure_at && (
            <div className="text-sm">
              <span className="text-muted-foreground">Última falha:</span>
              <span className="ml-2">
                {formatDistanceToNow(new Date(breaker.last_failure_at), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </span>
            </div>
          )}

          {breaker.last_success_at && (
            <div className="text-sm">
              <span className="text-muted-foreground">Último sucesso:</span>
              <span className="ml-2">
                {formatDistanceToNow(new Date(breaker.last_success_at), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </span>
            </div>
          )}

          {/* Tempo até próxima tentativa */}
          {breaker.state === 'open' && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="text-muted-foreground">Próxima tentativa:</span>
              <span className="font-medium">{getTimeUntilRetry()}</span>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
