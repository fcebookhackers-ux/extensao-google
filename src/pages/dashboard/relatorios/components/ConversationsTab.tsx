import * as React from "react";
import { Clock, MessageSquare, Repeat2, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conversationsMock } from "@/pages/dashboard/relatorios/mockData";
import { ConversationsVolumeChart } from "@/pages/dashboard/relatorios/components/charts/ConversationsVolumeChart";
import { ConversationsStatusPie } from "@/pages/dashboard/relatorios/components/charts/ConversationsStatusPie";
import { ConversationOriginsBar } from "@/pages/dashboard/relatorios/components/charts/ConversationOriginsBar";

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">{value}</div>
            {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConversationsTab() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total de Conversas" value={String(conversationsMock.kpis.total)} icon={Users} />
        <MetricCard
          title="Conversas Resolvidas"
          value={`${conversationsMock.kpis.resolved} (${conversationsMock.kpis.resolvedPct}%)`}
          icon={MessageSquare}
        />
        <MetricCard title="Tempo Médio de Atendimento" value={conversationsMock.kpis.avgHandleTime} icon={Clock} />
        <MetricCard title="Taxa de Transferência" value={`${conversationsMock.kpis.transferRatePct}%`} icon={Repeat2} />
      </section>

      <section>
        <ConversationsVolumeChart />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ConversationsStatusPie />
        <ConversationOriginsBar />
      </section>
    </div>
  );
}
