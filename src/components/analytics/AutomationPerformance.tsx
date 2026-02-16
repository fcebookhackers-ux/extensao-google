import { CheckCheck, Eye, MessageCircle, Send, XCircle } from "lucide-react";

import { useAutomationMetrics, usePerformanceMetrics } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AutomationPerformanceProps {
  automationId: string;
}

type Stat = {
  label: string;
  value: number;
  icon: typeof Send;
  percentage?: number;
  danger?: boolean;
};

export function AutomationPerformance({ automationId }: AutomationPerformanceProps) {
  const { data: metrics } = useAutomationMetrics(automationId);
  const performance = usePerformanceMetrics(automationId);

  if (!metrics || Array.isArray(metrics)) return null;

  const stats: Stat[] = [
    { label: "Enviadas", value: metrics.messages_sent, icon: Send },
    { label: "Entregues", value: metrics.messages_delivered, icon: CheckCheck, percentage: performance.deliveryRate },
    { label: "Lidas", value: metrics.messages_read, icon: Eye, percentage: performance.readRate },
    { label: "Respostas", value: metrics.messages_replied, icon: MessageCircle, percentage: performance.responseRate },
    { label: "Falhas", value: metrics.messages_failed, icon: XCircle, percentage: performance.errorRate, danger: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const iconClass = stat.danger ? "text-destructive" : "text-primary";
          return (
            <div key={stat.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className={"h-4 w-4 " + iconClass} />
                  <span className="text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-sm font-medium tabular-nums">
                  {stat.value.toLocaleString()}
                  {typeof stat.percentage === "number" ? (
                    <span className="ml-2 text-xs text-muted-foreground">({Math.round(stat.percentage)}%)</span>
                  ) : null}
                </div>
              </div>
              {typeof stat.percentage === "number" ? <Progress value={Math.max(0, Math.min(100, stat.percentage))} /> : null}
            </div>
          );
        })}

        <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
          <div className="text-sm text-muted-foreground">Contatos únicos</div>
          <div className="text-sm font-medium tabular-nums">{metrics.unique_contacts_reached.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
}
