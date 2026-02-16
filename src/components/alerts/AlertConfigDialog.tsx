import * as React from "react";
import { z } from "zod";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useValidatedForm } from "@/hooks/useValidatedForm";
import type { AlertConfigRow, AlertType } from "@/types/alerts";
import { useUpsertAlertConfig } from "@/hooks/useAlerts";

const alertTypes: Array<{ value: AlertType; label: string }> = [
  { value: "webhook_failure", label: "Webhook Failure" },
  { value: "high_latency", label: "High Latency" },
  { value: "quota_exceeded", label: "Quota Exceeded" },
  { value: "rate_limit_hit", label: "Rate Limit Hit" },
  { value: "circuit_breaker_open", label: "Circuit Breaker Open" },
];

const alertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Nome muito curto"),
  alert_type: z.enum(["webhook_failure", "high_latency", "quota_exceeded", "rate_limit_hit", "circuit_breaker_open"]),
  channels: z.array(z.enum(["in_app"])).min(1, "Selecione ao menos 1 canal"),
  enabled: z.boolean(),

  // campos dinâmicos
  consecutive_failures: z.coerce.number().int().min(1).optional(),
  threshold_ms: z.coerce.number().int().min(1).optional(),
  window_minutes: z.coerce.number().int().min(1).optional(),
  percentage: z.coerce.number().min(1).max(100).optional(),
  hits: z.coerce.number().int().min(1).optional(),
});

type FormValues = z.infer<typeof alertSchema>;

function buildConditions(values: FormValues): Record<string, any> {
  switch (values.alert_type) {
    case "webhook_failure":
      return { consecutive_failures: values.consecutive_failures ?? 5 };
    case "high_latency":
      return { threshold_ms: values.threshold_ms ?? 3000, window_minutes: values.window_minutes ?? 5 };
    case "quota_exceeded":
      return { percentage: values.percentage ?? 90 };
    case "rate_limit_hit":
      return { hits: values.hits ?? 3, window_minutes: values.window_minutes ?? 5 };
    case "circuit_breaker_open":
      return {};
  }
}

export function AlertConfigDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AlertConfigRow | null;
}) {
  const upsert = useUpsertAlertConfig();

  const defaults: FormValues = React.useMemo(
    () => ({
      id: initial?.id,
      name: initial?.name ?? "",
      alert_type: (initial?.alert_type ?? "webhook_failure") as any,
      channels: ["in_app"],
      enabled: initial?.enabled ?? true,

      consecutive_failures: initial?.conditions?.consecutive_failures ?? 5,
      threshold_ms: initial?.conditions?.threshold_ms ?? 3000,
      window_minutes: initial?.conditions?.window_minutes ?? 5,
      percentage: initial?.conditions?.percentage ?? 90,
      hits: initial?.conditions?.hits ?? 3,
    }),
    [initial],
  );

  const form = useValidatedForm(alertSchema, { defaultValues: defaults });

  React.useEffect(() => {
    form.reset(defaults);
  }, [defaults]);

  const alertType = form.watch("alert_type");
  const channels = form.watch("channels");
  const enabled = form.watch("enabled");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar alerta" : "Criar alerta"}</DialogTitle>
          <DialogDescription>Alertas geram notificações in-app com debounce de 1h.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            const conditions = buildConditions(values);
            await upsert.mutateAsync({
              id: values.id,
              name: values.name,
              alert_type: values.alert_type,
              conditions,
              channels: values.channels,
              enabled: values.enabled,
            });
            onOpenChange(false);
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome do alerta</Label>
            <Input id="name" placeholder="Ex: Falha recorrente de webhooks" {...form.register("name")} />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={alertType}
              onValueChange={(v) => {
                form.setValue("alert_type", v as any, { shouldDirty: true, shouldValidate: true });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {alertTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Condições</Label>

            {alertType === "webhook_failure" ? (
              <div className="grid gap-2">
                <Label htmlFor="consecutive_failures">Falhas consecutivas</Label>
                <Input id="consecutive_failures" type="number" min={1} {...form.register("consecutive_failures")} />
              </div>
            ) : null}

            {alertType === "high_latency" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="threshold_ms">Threshold (ms)</Label>
                  <Input id="threshold_ms" type="number" min={1} {...form.register("threshold_ms")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="window_minutes">Janela (min)</Label>
                  <Input id="window_minutes" type="number" min={1} {...form.register("window_minutes")} />
                </div>
              </div>
            ) : null}

            {alertType === "quota_exceeded" ? (
              <div className="grid gap-2">
                <Label htmlFor="percentage">Percentual da quota (%)</Label>
                <Input id="percentage" type="number" min={1} max={100} {...form.register("percentage")} />
              </div>
            ) : null}

            {alertType === "rate_limit_hit" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="hits">Atingiu N vezes</Label>
                  <Input id="hits" type="number" min={1} {...form.register("hits")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="window_minutes">Janela (min)</Label>
                  <Input id="window_minutes" type="number" min={1} {...form.register("window_minutes")} />
                </div>
              </div>
            ) : null}

            {alertType === "circuit_breaker_open" ? (
              <div className="text-sm text-muted-foreground">Sem parâmetros (dispara se algum circuit breaker estiver open).</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Canais</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={channels.includes("in_app")}
                onCheckedChange={(checked) => {
                  const next = checked ? ["in_app"] : [];
                  form.setValue("channels", next as any, { shouldDirty: true, shouldValidate: true });
                }}
                id="channel_in_app"
              />
              <Label htmlFor="channel_in_app">In-app</Label>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Ativo</div>
              <div className="text-sm text-muted-foreground">Ative/desative este alerta.</div>
            </div>
            <Switch checked={enabled} onCheckedChange={(v) => form.setValue("enabled", v, { shouldDirty: true })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
