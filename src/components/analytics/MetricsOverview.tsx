import { Activity, TrendingUp, Users, Zap } from "lucide-react";

import { useAutomationMetrics } from "@/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";

export function MetricsOverview() {
  const { data } = useAutomationMetrics();

  if (!data || !Array.isArray(data)) return null;

  const totalMessages = data.reduce((sum, m) => sum + (m.messages_sent ?? 0), 0);
  const totalContacts = data.reduce((sum, m) => sum + (m.unique_contacts_reached ?? 0), 0);
  const activeAutomations = data.filter((m) => m.status === "active").length;
  const avgDeliveryRate =
    data.length > 0
      ? data.reduce((sum, m) => {
          const sent = m.messages_sent ?? 0;
          const delivered = m.messages_delivered ?? 0;
          return sum + (sent > 0 ? (delivered / sent) * 100 : 0);
        }, 0) / data.length
      : 0;

  const metrics = [
    { label: "Mensagens enviadas", value: totalMessages.toLocaleString(), icon: Activity, tone: "primary" as const },
    { label: "Automações ativas", value: String(activeAutomations), icon: Zap, tone: "secondary" as const },
    { label: "Contatos alcançados", value: totalContacts.toLocaleString(), icon: Users, tone: "accent" as const },
    { label: "Entrega média", value: `${Math.round(avgDeliveryRate)}%`, icon: TrendingUp, tone: "muted" as const },
  ];

  const toneClass = (tone: (typeof metrics)[number]["tone"]) => {
    switch (tone) {
      case "primary":
        return "bg-primary/10 text-primary";
      case "secondary":
        return "bg-secondary/30 text-foreground";
      case "accent":
        return "bg-accent/20 text-accent-foreground";
      case "muted":
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{metric.label}</div>
                <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
              </div>
              <div className={"grid h-10 w-10 place-items-center rounded-md " + toneClass(metric.tone)}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
