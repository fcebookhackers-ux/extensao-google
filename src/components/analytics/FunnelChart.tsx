import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, Circle, TrendingUp } from "lucide-react";

import { useFunnelMetrics } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FunnelChart() {
  const { data: metrics, isLoading } = useFunnelMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil de ativação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const funnelSteps: Array<{ label: string; completed: boolean; date: string | null }> = [
    { label: "Cadastro", completed: true, date: metrics.signup_date },
    { label: "WhatsApp conectado", completed: metrics.whatsapp_connected, date: metrics.whatsapp_connected_at },
    { label: "Contatos importados", completed: metrics.contacts_imported, date: metrics.contacts_imported_at },
    { label: "Automação criada", completed: metrics.automation_created, date: metrics.automation_created_at },
    { label: "Automação ativada", completed: metrics.automation_activated, date: metrics.automation_activated_at },
    { label: "Primeira mensagem", completed: metrics.first_message_sent, date: metrics.first_message_sent_at },
  ];

  const completedSteps = funnelSteps.filter((s) => s.completed).length;
  const completionRate = (completedSteps / funnelSteps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Funil de ativação</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">Progresso do seu onboarding e primeiros resultados</div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {Math.round(completionRate)}% completo
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {funnelSteps.map((step, index) => {
            const StepIcon = step.completed ? CheckCircle : Circle;
            return (
              <div
                key={step.label}
                className="flex items-center justify-between gap-3 rounded-md border bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StepIcon className={step.completed ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {index + 1}. {step.label}
                    </div>
                    {step.date ? (
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(step.date), { addSuffix: true, locale: ptBR })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <Badge variant={step.completed ? "default" : "outline"}>{step.completed ? "Feito" : "Pendente"}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
