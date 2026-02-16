import * as React from "react";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";

import { DateRangePresetPicker } from "@/pages/dashboard/relatorios/components/DateRangePresetPicker";
import { KpiCard } from "@/pages/dashboard/relatorios/components/KpiCard";
import { ScheduleReportDialog } from "@/pages/dashboard/relatorios/components/ScheduleReportDialog";
import { ExportReportDialog } from "@/pages/dashboard/relatorios/components/ExportReportDialog";
import { AutomationsTab } from "@/pages/dashboard/relatorios/components/AutomationsTab";
import { ConversationsTab } from "@/pages/dashboard/relatorios/components/ConversationsTab";
import { TemplatesTab } from "@/pages/dashboard/relatorios/components/TemplatesTab";
import { TeamTab } from "@/pages/dashboard/relatorios/components/TeamTab";
import { WhatsAppTab } from "@/pages/dashboard/relatorios/components/WhatsAppTab";
import { MessagesOverTimeChart } from "@/pages/dashboard/relatorios/components/charts/MessagesOverTimeChart";
import { HourlyActivityChart } from "@/pages/dashboard/relatorios/components/charts/HourlyActivityChart";
import { WeekdayMessagesChart } from "@/pages/dashboard/relatorios/components/charts/WeekdayMessagesChart";
import { overviewMock } from "@/pages/dashboard/relatorios/mockData";

type MainTab = "visao_geral" | "automacoes" | "conversas" | "templates" | "equipe" | "whatsapp";

export default function DashboardRelatorios() {
  const [tab, setTab] = React.useState<MainTab>("visao_geral");
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios e Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe o desempenho do seu ZapFllow e atendimento</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePresetPicker />

          <Button className="gap-2" variant="outline" onClick={() => setExportOpen(true)}>
            Exportar Relatório
          </Button>

          <Button variant="outline" onClick={() => setScheduleOpen(true)}>
            Agendar Envio
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="visao_geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="automacoes">ZapFllow</TabsTrigger>
          <TabsTrigger value="conversas">Conversas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "visao_geral" ? (
        <div className="space-y-6">
          {/* KPIs */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={MessageSquare}
              iconClassName="text-primary"
              value={overviewMock.kpis.messages.value}
              label="Mensagens Enviadas"
              deltaLabel={overviewMock.kpis.messages.deltaLabel}
              deltaDirection={overviewMock.kpis.messages.deltaDirection}
              sparkline={overviewMock.kpis.messages.sparkline}
            />
            <KpiCard
              icon={Users}
              iconClassName="text-secondary"
              value={overviewMock.kpis.conversations.value}
              label="Conversas Iniciadas"
              deltaLabel={overviewMock.kpis.conversations.deltaLabel}
              deltaDirection={overviewMock.kpis.conversations.deltaDirection}
              sparkline={overviewMock.kpis.conversations.sparkline}
            />
            <KpiCard
              icon={Clock}
              iconClassName="text-accent"
              value={overviewMock.kpis.replyRate.value}
              label="Taxa de Resposta (<1h)"
              deltaLabel={overviewMock.kpis.replyRate.deltaLabel}
              deltaDirection={overviewMock.kpis.replyRate.deltaDirection}
              sparkline={overviewMock.kpis.replyRate.sparkline}
              valueSuffix="%"
            />
            <KpiCard
              icon={TrendingUp}
              iconClassName="text-primary"
              value={overviewMock.kpis.conversions.value}
              label="Conversões"
              deltaLabel={overviewMock.kpis.conversions.deltaLabel}
              deltaDirection={overviewMock.kpis.conversions.deltaDirection}
              sparkline={overviewMock.kpis.conversions.sparkline}
            />
          </section>

          {/* Gráfico principal */}
          <section>
            <MessagesOverTimeChart />
          </section>

          {/* Secundários */}
          <section className="grid gap-4 lg:grid-cols-2">
            <WeekdayMessagesChart />
            <HourlyActivityChart />
          </section>

          {/* Top performers */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ZapFllow com Mais Disparos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overviewMock.top.automations.map((a) => (
                  <div key={a.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-sm font-medium">{a.rankLabel} {a.name}</div>
                    <div className="shrink-0 text-sm text-muted-foreground">{a.count} disparos</div>
                  </div>
                ))}
                <Button variant="link" className="px-0" onClick={() => toast({ title: "Navegar", description: "Abrir tab ZapFllow (mock)" })}>
                  Ver todas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contatos Mais Ativos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overviewMock.top.contacts.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-sm font-medium">{c.rank}. {c.name}</div>
                    <div className="shrink-0 text-sm text-muted-foreground">{c.messages} mensagens</div>
                  </div>
                ))}
                <Button variant="link" className="px-0" onClick={() => toast({ title: "Navegar", description: "Ir para /dashboard/contatos (mock)" })}>
                  Ver todos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipe Mais Ativa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overviewMock.top.agents.map((a) => (
                  <div key={a.name} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-sm font-medium">{a.rank}. {a.name}</div>
                      <div className="shrink-0 text-sm text-muted-foreground">{a.conversations} conversas</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Tempo médio: {a.avgResponse}</div>
                  </div>
                ))}
                <Button variant="link" className="px-0" onClick={() => toast({ title: "Navegar", description: "Abrir tab Equipe (mock)" })}>
                  Ver equipe
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Qualidade */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tempo Médio de Primeira Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">2min 34s</div>
                  <div className="text-sm text-muted-foreground">Target: &lt; 5 min</div>
                </div>
                <div className="mt-2 text-sm text-primary">-15% vs. anterior</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Taxa de Resolução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">92%</div>
                  <div className="text-sm text-muted-foreground">Target: &gt; 85%</div>
                </div>
                <div className="mt-2 text-sm text-primary">+3% vs. anterior</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Satisfação (NPS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">4.7/5.0</div>
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" /> Excelente
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>★★★★★: 67%</div>
                  <div>★★★★: 23%</div>
                  <div>★★★: 8%</div>
                  <div>★★: 2%</div>
                  <div>★: 0%</div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      ) : tab === "automacoes" ? (
        <AutomationsTab />
      ) : tab === "conversas" ? (
        <ConversationsTab />
      ) : tab === "templates" ? (
        <TemplatesTab />
      ) : tab === "equipe" ? (
        <TeamTab />
      ) : (
        <WhatsAppTab />
      )}

      <ScheduleReportDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <ExportReportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
