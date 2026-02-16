import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotifications";
import type { NotificationPreferencesRow } from "@/types/notifications";

function Row({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-background p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function NotificationPreferences() {
  const prefsQuery = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const prefs = prefsQuery.data;
  const [local, setLocal] = React.useState<NotificationPreferencesRow | null>(null);

  React.useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);

  const setPref = (key: keyof NotificationPreferencesRow, value: boolean) => {
    if (!local) return;
    setLocal({ ...local, [key]: value });
  };

  const save = async () => {
    if (!local) return;
    const updates: Partial<NotificationPreferencesRow> = {
      webhook_failure_enabled: local.webhook_failure_enabled,
      webhook_circuit_open_enabled: local.webhook_circuit_open_enabled,
      storage_quota_warning_enabled: local.storage_quota_warning_enabled,
      storage_quota_critical_enabled: local.storage_quota_critical_enabled,
      media_processing_complete_enabled: local.media_processing_complete_enabled,
      media_processing_failed_enabled: local.media_processing_failed_enabled,
      system_announcement_enabled: local.system_announcement_enabled,
      security_alert_enabled: local.security_alert_enabled,
      email_notifications_enabled: local.email_notifications_enabled,
      email_digest_frequency: local.email_digest_frequency,
    };

    updatePrefs.mutate(updates, {
      onSuccess: () => toast({ title: "✅ Preferências salvas" }),
      onError: () => toast({ title: "Erro ao salvar preferências", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificações</CardTitle>
          <CardDescription>Configure quais alertas você deseja receber no app.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações In-App</CardTitle>
          <CardDescription>Esses alertas aparecem na inbox e em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row
            label="Falhas de Webhook"
            description="Notificar quando um webhook falhar repetidamente"
            checked={!!local?.webhook_failure_enabled}
            onCheckedChange={(v) => setPref("webhook_failure_enabled", v)}
          />
          <Row
            label="Circuit Breaker (aberto)"
            description="Alerta crítico quando o circuito do webhook abrir"
            checked={!!local?.webhook_circuit_open_enabled}
            onCheckedChange={(v) => setPref("webhook_circuit_open_enabled", v)}
          />
          <Row
            label="Quota de storage (80%)"
            description="Aviso quando estiver perto do limite"
            checked={!!local?.storage_quota_warning_enabled}
            onCheckedChange={(v) => setPref("storage_quota_warning_enabled", v)}
          />
          <Row
            label="Quota de storage (95%)"
            description="Alerta crítico quando estiver quase cheio"
            checked={!!local?.storage_quota_critical_enabled}
            onCheckedChange={(v) => setPref("storage_quota_critical_enabled", v)}
          />
          <Row
            label="Processamento de mídia concluído"
            description="Aviso quando um processamento terminar"
            checked={!!local?.media_processing_complete_enabled}
            onCheckedChange={(v) => setPref("media_processing_complete_enabled", v)}
          />
          <Row
            label="Processamento de mídia falhou"
            description="Aviso quando um processamento falhar"
            checked={!!local?.media_processing_failed_enabled}
            onCheckedChange={(v) => setPref("media_processing_failed_enabled", v)}
          />
          <Row
            label="Anúncios do sistema"
            description="Comunicados e avisos gerais"
            checked={!!local?.system_announcement_enabled}
            onCheckedChange={(v) => setPref("system_announcement_enabled", v)}
          />
          <Row
            label="Alertas de segurança"
            description="Alertas importantes de segurança"
            checked={!!local?.security_alert_enabled}
            onCheckedChange={(v) => setPref("security_alert_enabled", v)}
          />

          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={!local || updatePrefs.isPending}>
              {updatePrefs.isPending ? "Salvando..." : "Salvar preferências"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
