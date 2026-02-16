import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserConsents } from "@/hooks/useUserConsents";
import type { UserConsentType } from "@/types/consents";

export function ConsentManager() {
  // Novo sistema LGPD: user_consents (analytics/marketing/third_party) + Essential sempre ativo.
  const { consents, current, isLoading, updateConsent, revokeAll, isRevokingAll } = useUserConsents({ refetchIntervalMs: 30_000 });

  const latestChangeByType = (type: Exclude<UserConsentType, "essential">) => consents.find((c) => c.consent_type === type);

  const formatWhen = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar consentimentos (LGPD)</CardTitle>
        <CardDescription>
          Controle como seus dados podem ser usados. Essential é sempre ativo; os demais podem ser revogados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-sm">Essential (obrigatório)</Label>
              <p className="text-xs text-muted-foreground">Necessário para autenticação, segurança e funcionamento do produto.</p>
              <p className="text-xs text-muted-foreground">Última alteração: —</p>
            </div>
            <Switch checked disabled />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-sm">Analytics</Label>
              <p className="text-xs text-muted-foreground">Coleta de métricas de uso para melhorar o produto.</p>
              <p className="text-xs text-muted-foreground">
                Última alteração: {formatWhen(latestChangeByType("analytics")?.created_at)}
              </p>
            </div>
            <Switch
              checked={current.analytics}
              onCheckedChange={(checked) => updateConsent({ type: "analytics", granted: checked })}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-sm">Marketing</Label>
              <p className="text-xs text-muted-foreground">Receber emails promocionais e comunicações.</p>
              <p className="text-xs text-muted-foreground">
                Última alteração: {formatWhen(latestChangeByType("marketing")?.created_at)}
              </p>
            </div>
            <Switch
              checked={current.marketing}
              onCheckedChange={(checked) => updateConsent({ type: "marketing", granted: checked })}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-sm">Third Party</Label>
              <p className="text-xs text-muted-foreground">Compartilhar dados com integrações/terceiros quando você ativar conexões.</p>
              <p className="text-xs text-muted-foreground">
                Última alteração: {formatWhen(latestChangeByType("third_party")?.created_at)}
              </p>
            </div>
            <Switch
              checked={current.third_party}
              onCheckedChange={(checked) => updateConsent({ type: "third_party", granted: checked })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Ação rápida</p>
            <p className="text-xs text-muted-foreground">Revoga Analytics, Marketing e Third Party.</p>
          </div>
          <Button variant="destructive" onClick={() => revokeAll()} disabled={isRevokingAll}>
            {isRevokingAll ? "Revogando…" : "Revogar todos"}
          </Button>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="history">
            <AccordionTrigger>Histórico de mudanças</AccordionTrigger>
            <AccordionContent>
              {consents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {consents.slice(0, 50).map((c) => (
                    <div key={c.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{c.consent_type}</p>
                        <Badge variant={c.granted ? "secondary" : "outline"}>{c.granted ? "Concedido" : "Revogado"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                        {c.ip_address ? ` • IP: ${c.ip_address}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
