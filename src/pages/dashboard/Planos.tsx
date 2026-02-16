import * as React from "react";
import { Calendar, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { BillingComparisonDialog } from "@/pages/dashboard/planos/components/BillingComparisonDialog";
import { PaymentMethodDialog } from "@/pages/dashboard/planos/components/PaymentMethodDialog";
import { SalesContactDialog } from "@/pages/dashboard/planos/components/SalesContactDialog";
import { PlanComparisonGrid } from "@/pages/dashboard/planos/components/PlanComparisonGrid";
import { UsageProgress } from "@/pages/dashboard/planos/components/UsageProgress";
import { InvoicesTableCard } from "@/pages/dashboard/planos/components/InvoicesTableCard";
import { PaymentMethodsCard } from "@/pages/dashboard/planos/components/PaymentMethodsCard";
import { CouponCollapsibleCard } from "@/pages/dashboard/planos/components/CouponCollapsibleCard";
import { ReferralProgramCard } from "@/pages/dashboard/planos/components/ReferralProgramCard";
import { UpgradeDialog } from "@/pages/dashboard/planos/components/UpgradeDialog";
import { DowngradeAlertDialog } from "@/pages/dashboard/planos/components/DowngradeAlertDialog";
import { CancelSubscriptionDialog } from "@/pages/dashboard/planos/components/CancelSubscriptionDialog";
import { WHATSAPP_LINK } from "@/lib/links";

export default function DashboardPlanos() {
  const [annual, setAnnual] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [comparisonOpen, setComparisonOpen] = React.useState(false);
  const [salesOpen, setSalesOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [downgradeOpen, setDowngradeOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const currentPlan = {
    name: "Pro",
    tagline: "Ideal para negócios em crescimento",
    monthly: 197,
    annual: 1894,
    renewal: "27 de Fevereiro de 2026",
    paymentBrand: "Visa",
    paymentLast4: "4321",
    paymentExpiry: "12/2027",
    status: "active" as const,
    trialDaysRemaining: 3,
  };

  const usage = {
    contacts: { used: 1547, limit: 10000 },
    team: { used: 3, limit: 5 },
    automations: { used: 8, limit: null as number | null },
    messages: { used: 2847, limit: null as number | null },
  };

  const contactsPct = Math.round((usage.contacts.used / usage.contacts.limit) * 100);
  const showContactsWarning = contactsPct >= 90;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planos e Faturamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua assinatura e métodos de pagamento</p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-primary shadow-lg lg:col-span-2">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                SEU PLANO
              </Badge>
              {annual ? (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Economize 20%
                </Badge>
              ) : null}
            </div>

            <div>
              <CardTitle className="text-2xl">Plano {currentPlan.name}</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">{currentPlan.tagline}</div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-2">
                <div className="text-4xl font-semibold tracking-tight">
                  {annual ? `R$ ${currentPlan.annual.toLocaleString("pt-BR")}` : `R$ ${currentPlan.monthly}`}
                </div>
                <div className="pb-1 text-lg text-muted-foreground">{annual ? "/ano" : "/mês"}</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Mensal</div>
                <Switch checked={annual} onCheckedChange={setAnnual} />
                <div className="text-sm font-medium">Anual</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Próxima cobrança</div>
                  <div className="text-sm text-muted-foreground">{currentPlan.renewal}</div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <CreditCard className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {currentPlan.paymentBrand} •••• {currentPlan.paymentLast4}
                    </div>
                    <div className="text-sm text-muted-foreground">Válido até {currentPlan.paymentExpiry}</div>
                  </div>
                </div>
                <Button variant="link" className="h-auto px-0" onClick={() => setPaymentOpen(true)}>
                  Alterar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentPlan.status === "active" ? (
                <Badge className="px-3 py-1 text-sm">Ativo</Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1 text-sm">
                  Trial - {currentPlan.trialDaysRemaining} dias restantes
                </Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="text-sm font-medium">Uso do Plano</div>

              <UsageProgress
                label="Contatos"
                used={usage.contacts.used}
                limit={usage.contacts.limit}
                helper={`Você ainda tem ${(usage.contacts.limit - usage.contacts.used).toLocaleString("pt-BR")} contatos disponíveis`}
              />

              <UsageProgress
                label="Membros da Equipe"
                used={usage.team.used}
                limit={usage.team.limit}
                helper={
                  <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/dashboard/configuracoes?tab=equipe">
                    Convidar Membros
                  </Link>
                }
              />

              <UsageProgress label="ZapFllow Ativas" used={usage.automations.used} limit={null} />
              <UsageProgress label="Mensagens Enviadas (este mês)" used={usage.messages.used} limit={null} />

              {showContactsWarning ? (
                <Alert>
                  <AlertTitle>Você está próximo do limite de contatos</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>Considere fazer upgrade para evitar bloqueios.</span>
                    <Button variant="outline" onClick={() => setComparisonOpen(true)}>
                      Ver Planos Superiores
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button size="lg" className="sm:min-w-[180px]" onClick={() => setUpgradeOpen(true)}>
                Fazer Upgrade
              </Button>
              <Button size="lg" variant="outline" className="sm:min-w-[180px]" onClick={() => setDowngradeOpen(true)}>
                Fazer Downgrade
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="sm:min-w-[180px] border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setCancelOpen(true)}
              >
                Cancelar Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atalhos</CardTitle>
            <div className="text-sm text-muted-foreground">Ações rápidas (mock)</div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => setPaymentOpen(true)}>
              Gerenciar pagamento
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setComparisonOpen(true)}>
              Ver comparação completa
            </Button>
            <Button className="w-full" asChild>
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
                Falar com Vendas
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Compare Todos os Planos</h2>
            <p className="text-sm text-muted-foreground">Mensal ou anual (economize 20%)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mensal</span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className="text-sm font-medium">Anual</span>
            <Badge variant="outline">economize 20%</Badge>
          </div>
        </div>

        <PlanComparisonGrid
          annual={annual}
          currentPlanId="pro"
          onOpenComparison={() => setComparisonOpen(true)}
          onOpenSales={() => setSalesOpen(true)}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">Todos os preços em Reais (BRL). Impostos não inclusos.</div>
          <Button variant="link" className="h-auto px-0" onClick={() => setComparisonOpen(true)}>
            Ver comparação completa de recursos
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InvoicesTableCard methodLabel={`${currentPlan.paymentBrand} ••${currentPlan.paymentLast4}`} />
        </div>
        <div className="space-y-4">
          <PaymentMethodsCard onManage={() => setPaymentOpen(true)} />
          <CouponCollapsibleCard />
          <ReferralProgramCard />
        </div>
      </section>

      <PaymentMethodDialog open={paymentOpen} onOpenChange={setPaymentOpen} />
      <BillingComparisonDialog open={comparisonOpen} onOpenChange={setComparisonOpen} />
      <SalesContactDialog open={salesOpen} onOpenChange={setSalesOpen} />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <DowngradeAlertDialog open={downgradeOpen} onOpenChange={setDowngradeOpen} />
      <CancelSubscriptionDialog open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}
