import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { TemplateSelector } from "./TemplateSelector";
import { useCreateWebhookFromTemplate } from "@/hooks/useWebhookTemplates";
import type { WebhookTemplate } from "@/types/webhook-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ALL_EVENTS = [
  "automation.activated",
  "automation.paused",
  "message.sent",
  "message.delivered",
  "message.failed",
  "contact.created",
  "contact.updated",
] as const;

interface WebhookWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function WebhookWizard({ onComplete, onCancel }: WebhookWizardProps) {
  const createWebhook = useCreateWebhookFromTemplate();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<WebhookTemplate | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const steps = ["Template", "Configuração", "Eventos", "Revisão"];

  const defaults = useMemo(() => {
    if (!selectedTemplate) return { events: [] as string[], example: "" };
    return {
      events: selectedTemplate.default_events ?? [],
      example: selectedTemplate.example_url ?? "",
    };
  }, [selectedTemplate]);

  const canNext = useMemo(() => {
    if (step === 0) return !!selectedTemplate;
    if (step === 1) return webhookUrl.trim().startsWith("https://");
    if (step === 2) return selectedEvents.length > 0;
    return true;
  }, [step, selectedTemplate, webhookUrl, selectedEvents.length]);

  const goNext = () => {
    if (!canNext) return;
    setStep((s) => (s < 3 ? ((s + 1) as any) : s));
  };

  const goBack = () => setStep((s) => (s > 0 ? ((s - 1) as any) : s));

  const initEventsFromTemplate = (tpl: WebhookTemplate) => {
    const ev = (tpl.default_events ?? []).filter(Boolean);
    setSelectedEvents(ev.length ? ev : ["automation.activated"]);
  };

  const handleSelect = (tpl: WebhookTemplate) => {
    setSelectedTemplate(tpl);
    setWebhookName("");
    setWebhookUrl("");
    initEventsFromTemplate(tpl);
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    await createWebhook.mutateAsync({
      templateId: selectedTemplate.id,
      url: webhookUrl,
      name: webhookName?.trim() || selectedTemplate.name,
      events: selectedEvents,
    });

    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <Badge variant={idx === step ? "default" : idx < step ? "secondary" : "outline"}>{label}</Badge>
            {idx < steps.length - 1 ? <span className="text-muted-foreground">→</span> : null}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Escolha um template para começar.</p>
          <TemplateSelector onSelectTemplate={handleSelect} selectedTemplateId={selectedTemplate?.id} />
        </div>
      )}

      {step === 1 && selectedTemplate && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Configure os detalhes do webhook.</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Nome (opcional)</label>
            <Input
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
              placeholder={selectedTemplate.name}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">URL do Webhook (HTTPS) *</label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={defaults.example || "https://..."}
              inputMode="url"
              autoComplete="off"
            />
            {defaults.example ? (
              <p className="text-xs text-muted-foreground">Exemplo: {defaults.example}</p>
            ) : null}
          </div>

          {selectedTemplate.description ? (
            <Alert>
              <AlertDescription>{selectedTemplate.description}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}

      {step === 2 && selectedTemplate && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Selecione os eventos que você quer receber.</p>

          <div className="grid gap-3 md:grid-cols-2">
            {ALL_EVENTS.map((ev) => {
              const checked = selectedEvents.includes(ev);
              return (
                <label key={ev} className="flex items-start gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const on = !!v;
                      setSelectedEvents((prev) => (on ? Array.from(new Set([...prev, ev])) : prev.filter((x) => x !== ev)));
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{ev}</p>
                    <p className="text-xs text-muted-foreground">Padrão do template: {defaults.events.includes(ev) ? "sim" : "não"}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && selectedTemplate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Revise e crie o webhook.</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="grid gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium">{selectedTemplate.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="text-sm font-medium">{webhookName?.trim() || selectedTemplate.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">URL</p>
                <p className="text-sm font-medium break-all">{webhookUrl}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Eventos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedEvents.map((ev) => (
                    <Badge key={ev} variant="outline">
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={step === 0 ? onCancel : goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? "Cancelar" : "Voltar"}
        </Button>

        {step < 3 ? (
          <Button type="button" onClick={goNext} disabled={!canNext}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleCreate} disabled={createWebhook.isPending}>
            {createWebhook.isPending ? "Criando..." : "Criar Webhook"}
          </Button>
        )}
      </div>
    </div>
  );
}
