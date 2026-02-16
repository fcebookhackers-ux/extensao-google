import { AlertCircle, Clock } from "lucide-react";

import { useRateLimitStatus } from "@/hooks/useRateLimit";
import type { RateLimitEndpoint } from "@/types/rate-limit";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatResetTime } from "@/lib/rate-limiter";

interface RateLimitIndicatorProps {
  endpoint: RateLimitEndpoint;
  showDetails?: boolean;
}

export function RateLimitIndicator({ endpoint, showDetails = true }: RateLimitIndicatorProps) {
  const { allowed, remaining, resetAt, percentageUsed } = useRateLimitStatus(endpoint);

  if (!showDetails && allowed) return null;

  const isNearLimit = remaining < 5;
  const isAtLimit = !allowed;

  return (
    <div className="space-y-2">
      {showDetails ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Requisições restantes</span>
          <span className="font-medium">{remaining}</span>
        </div>
      ) : null}

      <Progress value={percentageUsed} />

      {isAtLimit && resetAt ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Limite excedido. Redefine em {formatResetTime(resetAt)}.</AlertDescription>
        </Alert>
      ) : null}

      {isNearLimit && !isAtLimit ? (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>Você está próximo do limite de requisições.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
