import * as React from "react";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WHATSAPP_LINK } from "@/lib/links";

type PlanId = "starter" | "pro" | "enterprise";

type Feature = { label: string; available: boolean };

type Plan = {
  id: PlanId;
  badge: string;
  title: string;
  priceMonthly: string;
  priceAnnual: string;
  highlight?: "primary" | "gold";
  features: Feature[];
};

const plans: Plan[] = [
  {
    id: "starter",
    badge: "BÁSICO",
    title: "Starter",
    priceMonthly: "R$ 79/mês",
    priceAnnual: "R$ 758/ano (R$ 63/mês)",
    features: [
      { label: "Até 1.000 contatos", available: true },
      { label: "3 ZapFllow ativas", available: true },
      { label: "1 membro da equipe", available: true },
      { label: "Templates básicos", available: true },
      { label: "Suporte por email (48h)", available: true },
      { label: "Relatórios básicos", available: true },
      { label: "WhatsApp integrado", available: true },
      { label: "Integrações externas", available: false },
      { label: "API de acesso", available: false },
      { label: "Webhooks", available: false },
      { label: "Pagamento Pix", available: false },
      { label: "Multi-atendentes", available: false },
      { label: "Suporte prioritário", available: false },
    ],
  },
  {
    id: "pro",
    badge: "MAIS POPULAR",
    title: "Pro",
    priceMonthly: "R$ 197/mês",
    priceAnnual: "R$ 1.894/ano (R$ 158/mês)",
    highlight: "primary",
    features: [
      { label: "Até 10.000 contatos", available: true },
      { label: "ZapFllow ilimitadas", available: true },
      { label: "5 membros da equipe", available: true },
      { label: "Templates avançados", available: true },
      { label: "Suporte prioritário (chat + WhatsApp)", available: true },
      { label: "Relatórios avançados + Analytics", available: true },
      { label: "Integrações (Zapier, Google Sheets, etc)", available: true },
      { label: "API de acesso", available: true },
      { label: "Webhooks personalizados", available: true },
      { label: "Pagamento Pix integrado", available: true },
      { label: "Multi-atendentes", available: true },
      { label: "Agendamento de campanhas", available: true },
      { label: "White-label", available: false },
      { label: "Múltiplos números WhatsApp", available: false },
      { label: "Gerente de conta dedicado", available: false },
      { label: "SLA garantido", available: false },
    ],
  },
  {
    id: "enterprise",
    badge: "ENTERPRISE",
    title: "Enterprise",
    priceMonthly: "Sob Consulta",
    priceAnnual: "Sob Consulta",
    highlight: "gold",
    features: [
      { label: "Contatos ilimitados", available: true },
      { label: "Usuários ilimitados", available: true },
      { label: "Tudo do Plano Pro +", available: true },
      { label: "Múltiplos números WhatsApp", available: true },
      { label: "White-label (sua marca)", available: true },
      { label: "Gerente de conta dedicado", available: true },
      { label: "Onboarding personalizado", available: true },
      { label: "SLA garantido 99.9%", available: true },
      { label: "Suporte 24/7", available: true },
      { label: "Infraestrutura dedicada", available: true },
      { label: "Treinamento da equipe", available: true },
      { label: "Personalização de features", available: true },
    ],
  },
];

function FeatureRow({ label, available }: Feature) {
  const Icon = available ? Check : X;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={cn("mt-0.5 h-4 w-4", available ? "text-primary" : "text-muted-foreground")} />
      <span className={cn(!available && "text-muted-foreground line-through")}>{label}</span>
    </li>
  );
}

export function PlanComparisonGrid({
  annual,
  currentPlanId,
  onOpenComparison,
  onOpenSales: _onOpenSales,
}: {
  annual: boolean;
  currentPlanId: PlanId;
  onOpenComparison: () => void;
  onOpenSales: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((p) => {
        const isCurrent = p.id === currentPlanId;
        const isPro = p.id === "pro";
        const borderClass =
          p.highlight === "primary"
            ? "border-primary"
            : p.highlight === "gold"
              ? "border-brand-secondary"
              : "";

        const cardClass = cn(
          "relative",
          borderClass,
          isPro && "shadow-lg lg:scale-[1.03]",
        );

        return (
          <Card key={p.id} className={cardClass}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={p.id === "starter" ? "outline" : "default"}>{p.badge}</Badge>
                {isCurrent ? <Badge className="bg-primary text-primary-foreground">SEU PLANO ATUAL</Badge> : null}
              </div>
              <CardTitle className="text-xl">{p.title}</CardTitle>
              <div className="text-sm text-muted-foreground">{annual ? p.priceAnnual : p.priceMonthly}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              {p.id === "enterprise" ? (
                <Button className="w-full" asChild>
                  <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
                    Falar com Vendas
                  </a>
                </Button>
              ) : isCurrent ? (
                <Button className="w-full" disabled>
                  Plano Atual
                </Button>
              ) : (
                <Button className="w-full" variant="outline" onClick={onOpenComparison}>
                  Selecionar Plano
                </Button>
              )}

              <ul className="space-y-2">
                {p.features.map((f) => (
                  <FeatureRow key={f.label} {...f} />
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
