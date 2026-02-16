import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bot,
  Crown,
  MessageSquare,
  Plus,
  Send,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import {
  automationsMock,
  dashboardKpisMock,
  messagesChartByPeriodMock,
  recentConversationsMock,
  type AutomationItem,
  type DashboardKpis,
} from "@/pages/dashboard/mockData";
import { CircularProgress } from "@/components/dashboard/home/CircularProgress";

export default function DashboardInicio() {
  return <DashboardInicioContent />;
}

function DashboardInicioContent() {
  // Placeholder: quando integrar WhatsApp/Onboarding, substitua por estado real
  const [isWhatsappConnected] = React.useState(false);
  const [onboardingStepsCompleted] = React.useState(0); // 0/3
  const [plan] = React.useState<"starter" | "pro" | "enterprise">("starter");

  const [loading, setLoading] = React.useState(true);
  const [kpis, setKpis] = React.useState<DashboardKpis | null>(null);
  const [period, setPeriod] = React.useState<"7d" | "30d" | "90d">("7d");
  const [automations, setAutomations] = React.useState<AutomationItem[]>([]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setKpis(dashboardKpisMock);
      setAutomations(automationsMock);
      setLoading(false);
    }, 650);
    return () => window.clearTimeout(t);
  }, []);

  const showOnboardingAlert = onboardingStepsCompleted < 3;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Início</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu ZapFllow.</p>
      </header>

      {/* ALERTAS */}
      <div className="grid gap-3">
        {!isWhatsappConnected && (
          <Alert className="border-secondary/40 bg-secondary/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              Conexão necessária
              <HelpTooltip text="Conecte seu WhatsApp Business para habilitar ZapFllow e conversas." />
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>⚠️ Conecte seu WhatsApp Business para começar o ZapFllow</p>
              <Button asChild className="w-fit bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90">
                <Link to="/dashboard/whatsapp">Conectar Agora</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {showOnboardingAlert && (
          <Alert className="border-primary/25 bg-primary/5">
            <BarChart3 className="h-4 w-4" />
            <AlertTitle>🎉 Bem-vindo!</AlertTitle>
            <AlertDescription className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p>Complete seu perfil em 3 passos para começar</p>
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{onboardingStepsCompleted}/3 passos</span>
                    <span>{Math.round((onboardingStepsCompleted / 3) * 100)}%</span>
                  </div>
                  <Progress value={(onboardingStepsCompleted / 3) * 100} />
                </div>
              </div>
              <Button variant="outline" className="w-fit">
                Começar Tour
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          loading={loading}
          title="Mensagens Enviadas"
          icon={<Send className="h-5 w-5 text-brand-primary-light" />}
          value={kpis?.sentToday}
          footer={
            <div className="flex items-center gap-1 text-sm text-brand-primary-light">
              <ArrowUpRight className="h-4 w-4" /> +{kpis?.sentVsYesterdayPct}% vs. ontem
            </div>
          }
          right={
            loading || !kpis ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="h-10 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={kpis.sentSparkline7d.map((v, i) => ({ idx: i, v }))}
                    margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
                  >
                    <Line type="monotone" dataKey="v" stroke="hsl(var(--brand-primary-light))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          }
        />

        <KpiCard
          loading={loading}
          title="Conversas Ativas"
          icon={<MessageSquare className="h-5 w-5 text-primary" />}
          value={kpis?.activeConversations}
          footer={
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="h-5 px-2">
                {kpis?.unreadConversations ?? 0} não lidas
              </Badge>
              <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/dashboard/conversas">
                Ver todas
              </Link>
            </div>
          }
        />

        <KpiCard
          loading={loading}
          title="Taxa de Resposta"
          icon={<TrendingUp className="h-5 w-5 text-brand-primary-light" />}
          value={kpis ? `${kpis.responseRatePct}%` : undefined}
          footer={<p className="text-sm text-muted-foreground">Tempo médio: {kpis?.avgResponseTime ?? "—"}</p>}
          right={
            loading || !kpis ? (
              <Skeleton className="h-20 w-20 rounded-full" />
            ) : (
              <CircularProgress value={kpis.responseRatePct} size={80} stroke={10} />
            )
          }
        />

        <KpiCard
          loading={loading}
          title="Novos Contatos (7 dias)"
          icon={<UserPlus className="h-5 w-5 text-secondary" />}
          value={kpis?.newContacts7d}
          footer={<p className="text-sm text-muted-foreground">+{kpis?.newContactsToday ?? 0} hoje</p>}
        />
      </section>

      {/* GRÁFICO PRINCIPAL */}
      <section>
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Mensagens Enviadas vs. Recebidas</CardTitle>
              <CardDescription>Últimos {period === "7d" ? "7 dias" : period === "30d" ? "30 dias" : "90 dias"}</CardDescription>
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 dias</SelectItem>
                  <SelectItem value="30d">30 dias</SelectItem>
                  <SelectItem value="90d">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={messagesChartByPeriodMock[period]} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sent" name="Mensagens Enviadas" stroke="hsl(var(--brand-primary-light))" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="received" name="Mensagens Recebidas" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* CONVERSAS RECENTES */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Conversas Recentes</CardTitle>
            <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/dashboard/conversas">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <ul className="grid gap-1">
                {recentConversationsMock.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/dashboard/conversas/${c.id}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="relative">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-semibold">
                          {c.initials}
                        </div>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                            c.online ? "bg-brand-primary-light" : "bg-muted-foreground/40",
                          )}
                          aria-label={c.online ? "Online" : "Offline"}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">{c.timeAgo}</span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {c.lastMessage.length > 50 ? `${c.lastMessage.slice(0, 50)}…` : c.lastMessage}
                        </p>
                      </div>

                      {c.unread ? (
                        <Badge className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90">
                          Novo
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Button className="w-full" variant="outline">
              Iniciar Nova Conversa
            </Button>
          </CardContent>
        </Card>

        {/* UPSSELL (Starter) */}
        {plan === "starter" ? (
          <Card className="bg-card shadow-sm border-2 border-secondary/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-secondary" /> Desbloqueie Recursos Avançados
              </CardTitle>
              <CardDescription>Upgrade para Pro e acelere seu crescimento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="grid gap-2 text-sm">
                {[
                  "✓ Fluxos ilimitados",
                  "✓ Integrações com Zapier",
                  "✓ API de acesso",
                ].map((t) => (
                  <li key={t} className="text-muted-foreground">
                    {t}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Link to="/dashboard/planos">Fazer Upgrade para Pro</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {/* ZAPFLLOW ATIVAS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ZapFllow Ativas</h2>
          <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/dashboard/automacoes">
            Ver todas
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(loading ? Array.from({ length: 3 }) : automations.slice(0, 3)).map((item, idx) =>
            loading ? (
              <Skeleton key={idx} className="h-[168px] w-full" />
            ) : (
              <AutomationCard
                key={(item as AutomationItem).id}
                item={item as AutomationItem}
                onToggle={(id, active) =>
                  setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, active } : a)))
                }
              />
            ),
          )}
        </div>
      </section>

      {/* ATALHOS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Atalhos Rápidos</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <QuickAction
            to="/dashboard/automacoes/nova"
            icon={<Plus className="h-5 w-5 text-brand-primary-light" />}
            title="Criar Novo ZapFllow"
            subtitle="Configure um novo fluxo"
          />
          <QuickAction
            to="/dashboard/campanhas/nova"
            icon={<Send className="h-5 w-5 text-brand-primary-light" />}
            title="Enviar Campanha"
            subtitle="Mensagem em massa"
          />
          <QuickAction
            to="/dashboard/contatos/novo"
            icon={<UserPlus className="h-5 w-5 text-brand-primary-light" />}
            title="Adicionar Contatos"
            subtitle="Importar ou criar"
          />
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  loading,
  title,
  value,
  icon,
  footer,
  right,
}: {
  loading: boolean;
  title: string;
  value?: number | string;
  icon: React.ReactNode;
  footer?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card className="bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className="text-3xl font-semibold tracking-tight">
              {loading ? <Skeleton className="h-8 w-20" /> : value ?? "—"}
            </div>
          </div>
          <div className="mt-1">{icon}</div>
        </div>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <div className="min-w-0">{loading ? <Skeleton className="h-4 w-36" /> : footer}</div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </CardContent>
    </Card>
  );
}

function AutomationCard({
  item,
  onToggle,
}: {
  item: AutomationItem;
  onToggle: (id: string, active: boolean) => void;
}) {
  return (
    <Card className="bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand-primary-light" />
            <CardTitle className="text-base">{item.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.active ? "Ativo" : "Pausado"}</span>
            <Switch checked={item.active} onCheckedChange={(v) => onToggle(item.id, v)} aria-label="Ativar/pausar" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1 text-sm text-muted-foreground">
          <p>{item.shotsToday} disparos hoje</p>
          <p>Taxa conclusão: {item.completionRatePct}%</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            Editar
          </Button>
          <Button size="sm" variant="outline">
            Ver Relatório
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-auto w-full justify-start gap-3 border-border bg-background p-5 text-left transition-colors hover:bg-brand-primary-lighter"
    >
      <Link to={to}>
        <span className="mt-0.5">{icon}</span>
        <span className="grid gap-1">
          <span className="font-medium text-foreground">{title}</span>
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        </span>
      </Link>
    </Button>
  );
}

