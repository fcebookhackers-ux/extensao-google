import * as React from "react";
import { Lightbulb, TrendingDown } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { funnels, type FunnelId } from "@/components/analytics/conversion-funnels";
import { useConversionFunnel } from "@/hooks/useConversionFunnel";

type Dropoff = {
  index: number;
  fromName: string;
  toName: string;
  dropPct: number;
};

function buildSuggestion(funnelId: FunnelId, drop?: Dropoff) {
  if (!drop) return null;

  if (funnelId === "onboarding") {
    if (drop.toName === "Primeira Automação") {
      return "Sugestão: reduza fricção para criar a 1ª automação (template pronto, CTA direto e tour guiado).";
    }
    if (drop.toName === "Automação Publicada") {
      return "Sugestão: deixe o publish mais claro (validações explicativas e botão ‘Publicar’ visível no editor).";
    }
    if (drop.toName === "Webhook Executado") {
      return "Sugestão: destaque a integração/webhook (exemplo de URL, teste rápido e feedback de sucesso/erro).";
    }
    return "Sugestão: melhore o conteúdo/CTA do próximo passo para reduzir abandono.";
  }

  // feature_adoption
  if (drop.toName === "Clicou") return "Sugestão: aumente a encontrabilidade (botões mais próximos do contexto e microcopy clara).";
  if (drop.toName === "Completou") return "Sugestão: quebre em etapas menores e mostre progresso/benefício imediato na conclusão.";
  return "Sugestão: simplifique o fluxo e deixe o próximo passo óbvio.";
}

function FunnelBars({ funnelId }: { funnelId: FunnelId }) {
  const { data, isLoading } = useConversionFunnel(funnelId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const steps = data ?? [];
  const base = steps[0]?.users ?? 0;

  const drops: Dropoff[] = steps
    .map((s, idx) => {
      if (idx === 0) return null;
      const prev = steps[idx - 1]?.users ?? 0;
      const cur = s.users ?? 0;
      const dropPct = prev > 0 ? ((prev - cur) / prev) * 100 : 0;
      return {
        index: idx,
        fromName: steps[idx - 1]?.name ?? "",
        toName: s.name,
        dropPct,
      };
    })
    .filter(Boolean) as Dropoff[];

  const worstDrop = drops.reduce<Dropoff | null>((acc, d) => {
    if (!acc) return d;
    return d.dropPct > acc.dropPct ? d : acc;
  }, null);

  const suggestion = buildSuggestion(funnelId, worstDrop ?? undefined);

  if (!steps.length) {
    return <div className="text-sm text-muted-foreground">Selecione um workspace para ver os dados do funil.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const pct = base > 0 ? (step.users / base) * 100 : 0;
          const isWorst = worstDrop?.index === idx;
          return (
            <div key={step.step} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm font-medium">
                  {idx + 1}. {step.name}
                </div>
                <div className="flex items-center gap-2">
                  {isWorst ? (
                    <Badge variant="secondary" className="gap-1">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Maior drop
                    </Badge>
                  ) : null}
                  <Badge variant="outline">{step.users}</Badge>
                </div>
              </div>

              <div className={"h-8 overflow-hidden rounded-full bg-muted " + (isWorst ? "ring-1 ring-primary" : "")}
              >
                <div
                  className="flex h-full items-center px-3 text-sm font-medium text-primary-foreground bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                  aria-label={`${step.name}: ${step.users} (${pct.toFixed(1)}%)`}
                >
                  {step.users} ({pct.toFixed(1)}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {worstDrop ? (
        <div className="rounded-md border bg-card p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Drop-off detectado</div>
            <Badge variant="secondary">-{worstDrop.dropPct.toFixed(1)}%</Badge>
          </div>
          <div className="mt-1 text-muted-foreground">
            Maior abandono entre <span className="font-medium text-foreground">{worstDrop.fromName}</span> →{" "}
            <span className="font-medium text-foreground">{worstDrop.toName}</span>.
          </div>
          {suggestion ? (
            <div className="mt-3 flex items-start gap-2 text-muted-foreground">
              <Lightbulb className="mt-0.5 h-4 w-4 text-primary" />
              <div>{suggestion}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ConversionFunnelsCard() {
  const [tab, setTab] = React.useState<FunnelId>("onboarding");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Funis de conversão</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">Acompanhe conversão por etapa e onde ocorre o maior drop-off</div>
          </div>
          <Badge variant="secondary">{Object.keys(funnels).length} funis</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as FunnelId)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="feature_adoption">Adoção</TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="mt-4">
            <FunnelBars funnelId="onboarding" />
          </TabsContent>

          <TabsContent value="feature_adoption" className="mt-4">
            <FunnelBars funnelId="feature_adoption" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
