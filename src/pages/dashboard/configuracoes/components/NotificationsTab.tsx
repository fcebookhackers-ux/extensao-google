import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotifications";

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-background p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function NotificationsTab() {
  const prefsQuery = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const prefs = prefsQuery.data;

  const setPref = (key: string, value: boolean) => {
    if (!prefs) return;
    updatePrefs.mutate(
      { [key]: value } as any,
      {
        onSuccess: () => toast({ title: "✅ Preferências atualizadas" }),
        onError: () => toast({ title: "Erro ao salvar preferências", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificações</CardTitle>
          <CardDescription>Gerencie as notificações in-app em tempo real.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações In-App</CardTitle>
          <CardDescription>Esses alertas aparecem no sino e na inbox de notificações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SwitchRow
            label="Falhas de Webhook"
            description="Notificar quando um webhook falhar repetidamente"
            checked={!!prefs?.webhook_failure_enabled}
            onCheckedChange={(v) => setPref("webhook_failure_enabled", v)}
          />
          <SwitchRow
            label="Circuit Breaker (aberto)"
            description="Alerta crítico quando o circuito do webhook abrir"
            checked={!!prefs?.webhook_circuit_open_enabled}
            onCheckedChange={(v) => setPref("webhook_circuit_open_enabled", v)}
          />
          <SwitchRow
            label="Quota de storage (80%)"
            description="Aviso quando estiver perto do limite"
            checked={!!prefs?.storage_quota_warning_enabled}
            onCheckedChange={(v) => setPref("storage_quota_warning_enabled", v)}
          />
          <SwitchRow
            label="Quota de storage (95%)"
            description="Alerta crítico quando estiver quase cheio"
            checked={!!prefs?.storage_quota_critical_enabled}
            onCheckedChange={(v) => setPref("storage_quota_critical_enabled", v)}
          />
          <SwitchRow
            label="Processamento de mídia concluído"
            description="Aviso quando um processamento terminar"
            checked={!!prefs?.media_processing_complete_enabled}
            onCheckedChange={(v) => setPref("media_processing_complete_enabled", v)}
          />
          <SwitchRow
            label="Processamento de mídia falhou"
            description="Aviso quando um processamento falhar"
            checked={!!prefs?.media_processing_failed_enabled}
            onCheckedChange={(v) => setPref("media_processing_failed_enabled", v)}
          />
          <SwitchRow
            label="Anúncios do sistema"
            description="Comunicados e avisos gerais"
            checked={!!prefs?.system_announcement_enabled}
            onCheckedChange={(v) => setPref("system_announcement_enabled", v)}
          />
          <SwitchRow
            label="Alertas de segurança"
            description="Alertas importantes de segurança (sempre críticos quando necessário)"
            checked={!!prefs?.security_alert_enabled}
            onCheckedChange={(v) => setPref("security_alert_enabled", v)}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="button" variant="outline" onClick={() => toast({ title: "✅ Preferências salvas automaticamente" })}>
            Ok
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Push</CardTitle>
          <CardDescription>Indisponível nesta versão (somente in-app realtime).</CardDescription>
        </CardHeader>
        <CardContent>
          <SwitchRow
            label="Notificações no Navegador"
            description="Em breve: push no navegador (requer permissão)"
            checked={false}
            onCheckedChange={() => toast({ title: "Em breve", description: "Push no navegador será adicionado depois." })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
