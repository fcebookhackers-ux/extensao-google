import * as React from "react";
import {
  Calendar,
  CreditCard,
  Link2,
  Sheet,
  Webhook,
  Zap,
  Building2,
  ExternalLink,
  Code,
  Check,
  Plus,
  Trash2,
  TestTube2,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { WEBHOOK_CONFIG_TOUR } from "@/config/tours";

type IntegrationId =
  | "google_sheets"
  | "google_calendar"
  | "zapier"
  | "stripe"
  | "asaas"
  | "rd_station"
  | "hubspot"
  | "mercado_pago"
  | "webhooks";

type IntegrationCardDef = {
  id: IntegrationId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  supportsDisconnect?: boolean;
};

const INTEGRATIONS: IntegrationCardDef[] = [
  {
    id: "google_sheets",
    title: "Google Sheets",
    description: "Exporte contatos e conversas automaticamente para planilhas",
    icon: Sheet,
  },
  {
    id: "google_calendar",
    title: "Google Calendar",
    description: "Sincronize agendamentos com sua agenda",
    icon: Calendar,
    supportsDisconnect: true,
  },
  { id: "zapier", title: "Zapier", description: "Integre com 5.000+ aplicativos via Zapier", icon: Zap },
  {
    id: "stripe",
    title: "Stripe",
    description: "Receba pagamentos com cartão de crédito",
    icon: CreditCard,
  },
  {
    id: "asaas",
    title: "Asaas",
    description: "Gateway de pagamento brasileiro (PIX, Boleto, Cartão)",
    icon: Building2,
    supportsDisconnect: true,
  },
  {
    id: "rd_station",
    title: "RD Station",
    description: "Sincronize leads com sua ferramenta de marketing",
    icon: Link2,
  },
  {
    id: "hubspot",
    title: "HubSpot",
    description: "CRM integrado com suas conversas",
    icon: Link2,
    comingSoon: true,
  },
  {
    id: "mercado_pago",
    title: "Mercado Pago",
    description: "Pagamentos com PIX, cartão e mais",
    icon: CreditCard,
  },
  {
    id: "webhooks",
    title: "Webhook Personalizado",
    description: "Envie eventos para qualquer URL",
    icon: Webhook,
  },
];

type ConnectedState = Record<IntegrationId, boolean>;

function statusBadge(connected: boolean, comingSoon?: boolean) {
  if (comingSoon) return <Badge variant="outline">Em breve</Badge>;
  return connected ? <Badge>Conectado</Badge> : <Badge variant="secondary">Não Conectado</Badge>;
}

function IntegrationTile({
  def,
  connected,
  onConnect,
  onConfigure,
  onDisconnect,
}: {
  def: IntegrationCardDef;
  connected: boolean;
  onConnect: () => void;
  onConfigure: () => void;
  onDisconnect?: () => void;
}) {
  const Icon = def.icon;
  const disabled = !!def.comingSoon;

  return (
    <Card className={disabled ? "opacity-60" : undefined}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/30">
              <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">{def.title}</CardTitle>
              <CardDescription>{def.description}</CardDescription>
            </div>
          </div>
          {statusBadge(connected, def.comingSoon)}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {def.comingSoon ? (
          <Button type="button" variant="outline" disabled>
            Em breve
          </Button>
        ) : connected ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={onConfigure} {...(def.id === "webhooks" ? { "data-tour": "webhook-config" } : {})}>
              Configurar
            </Button>
            {def.supportsDisconnect ? (
              <Button type="button" variant="link" className="h-auto px-0" onClick={onDisconnect}>
                Desconectar
              </Button>
            ) : null}
          </div>
        ) : (
          <Button type="button" onClick={onConnect} {...(def.id === "webhooks" ? { "data-tour": "webhook-config" } : {})}>
            Conectar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StarterLockedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrações</CardTitle>
        <CardDescription>🔒 Integrações disponíveis apenas nos Planos Pro e Enterprise</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/50 p-4 text-sm">
          <p className="font-medium">Prévia de integrações</p>
          <p className="mt-1 text-muted-foreground">Conecte com Google, Zapier, pagamentos e webhooks (bloqueado no Starter).</p>
        </div>
        <Button type="button">Fazer Upgrade</Button>
      </CardContent>
    </Card>
  );
}

export function IntegrationsTab() {
  // Mock de plano: Pro+
  const isStarter = false;

  const [connected, setConnected] = React.useState<ConnectedState>({
    google_sheets: false,
    google_calendar: true,
    zapier: false,
    stripe: false,
    asaas: true,
    rd_station: false,
    hubspot: false,
    mercado_pago: false,
    webhooks: true,
  });

  const [sheetsOpen, setSheetsOpen] = React.useState(false);
  const [webhooksOpen, setWebhooksOpen] = React.useState(false);
  const [asaasOpen, setAsaasOpen] = React.useState(false);

  if (isStarter) return <StarterLockedCard />;

  return (
    <div className="space-y-4">
      <OnboardingTour tourId="webhook-config" steps={WEBHOOK_CONFIG_TOUR} />
      <Card>
        <CardHeader>
          <CardTitle>Integrações Disponíveis</CardTitle>
          <CardDescription>Conecte com suas ferramentas favoritas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {INTEGRATIONS.map((def) => (
              <IntegrationTile
                key={def.id}
                def={def}
                connected={connected[def.id]}
                onConnect={() => {
                  if (def.id === "google_sheets") return setSheetsOpen(true);
                  if (def.id === "webhooks") return setWebhooksOpen(true);
                  if (def.id === "asaas") return setAsaasOpen(true);
                  toast({ title: `Conectar ${def.title} (mock)` });
                }}
                onConfigure={() => {
                  if (def.id === "google_sheets") return setSheetsOpen(true);
                  if (def.id === "webhooks") return setWebhooksOpen(true);
                  if (def.id === "asaas") return setAsaasOpen(true);
                  toast({ title: `Configurar ${def.title} (mock)` });
                }}
                onDisconnect={
                  def.supportsDisconnect
                    ? () => {
                        setConnected((prev) => ({ ...prev, [def.id]: false }));
                        toast({ title: `${def.title} desconectado (mock)` });
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <ConnectGoogleSheetsDialog
        open={sheetsOpen}
        onOpenChange={setSheetsOpen}
        onConnected={() => setConnected((p) => ({ ...p, google_sheets: true }))}
      />

      <ManageWebhooksDialog open={webhooksOpen} onOpenChange={setWebhooksOpen} />

      <ConnectAsaasDialog
        open={asaasOpen}
        onOpenChange={setAsaasOpen}
        onConnected={() => setConnected((p) => ({ ...p, asaas: true }))}
      />
    </div>
  );
}

function ConnectGoogleSheetsDialog({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected: () => void;
}) {
  const [authed, setAuthed] = React.useState(false);
  const [exportItems, setExportItems] = React.useState({
    newContacts: true,
    resolvedConversations: true,
    messages: false,
    weeklyReports: false,
  });

  const [sheet, setSheet] = React.useState<string>("");
  const [frequency, setFrequency] = React.useState<string>("realtime");

  React.useEffect(() => {
    if (!open) {
      setAuthed(false);
      setSheet("");
      setFrequency("realtime");
      setExportItems({ newContacts: true, resolvedConversations: true, messages: false, weeklyReports: false });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar Google Sheets</DialogTitle>
          <DialogDescription>Esta integração precisa acessar suas planilhas.</DialogDescription>
        </DialogHeader>

        {!authed ? (
          <div className="space-y-3">
            <Button type="button" className="w-full" onClick={() => setAuthed(true)}>
              Continuar com Google
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              OAuth flow simulado (mock).
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Escolha a planilha de destino *</p>
              <Select value={sheet} onValueChange={setSheet}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {["CRM - Contatos", "Conversas - Resumo", "Relatórios"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">Criar nova planilha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">O que exportar</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={exportItems.newContacts}
                    onCheckedChange={(v) => setExportItems((p) => ({ ...p, newContacts: Boolean(v) }))}
                  />
                  Novos contatos (em tempo real)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={exportItems.resolvedConversations}
                    onCheckedChange={(v) => setExportItems((p) => ({ ...p, resolvedConversations: Boolean(v) }))}
                  />
                  Conversas finalizadas (diariamente)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={exportItems.messages}
                    onCheckedChange={(v) => setExportItems((p) => ({ ...p, messages: Boolean(v) }))}
                  />
                  Mensagens (todas)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={exportItems.weeklyReports}
                    onCheckedChange={(v) => setExportItems((p) => ({ ...p, weeklyReports: Boolean(v) }))}
                  />
                  Relatórios semanais
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Frequência de sincronização</p>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Tempo real</SelectItem>
                  <SelectItem value="hourly">A cada hora</SelectItem>
                  <SelectItem value="daily">Diariamente</SelectItem>
                </SelectContent>
              </Select>
              {frequency === "daily" ? (
                <p className="text-xs text-muted-foreground">Escolha de horário (mock) será adicionada depois.</p>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!authed || !sheet}
            onClick={() => {
              onConnected();
              toast({ title: "✅ Integração salva", description: "Google Sheets conectado (mock)." });
              onOpenChange(false);
            }}
          >
            Salvar Integração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const webhookSchema = z.object({
  url: z
    .string()
    .trim()
    .url("URL inválida")
    .refine((v) => v.startsWith("https://"), "HTTPS obrigatório"),
  method: z.enum(["POST", "GET"]).default("POST"),
  events: z.array(z.string()).min(1, "Selecione pelo menos 1 evento"),
  retryEnabled: z.boolean().default(true),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(3),
  retryIntervalSec: z.coerce.number().int().min(10).max(3600).default(60),
  secretToken: z.string().trim().min(8, "Mínimo 8 caracteres").default("token_demo_123"),
  headers: z
    .array(
      z.object({
        key: z.string().trim().min(1, "Obrigatório"),
        value: z.string().trim().min(1, "Obrigatório"),
      }),
    )
    .default([]),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

function ManageWebhooksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [creating, setCreating] = React.useState(false);
  const [webhooks, setWebhooks] = React.useState<
    Array<{ id: string; url: string; events: string[]; active: boolean; lastAttempt: string }>
  >([
    {
      id: "w1",
      url: "https://meusite.com/webhook/whatsapp",
      events: ["nova_conversa", "mensagem_recebida"],
      active: true,
      lastAttempt: "Há 5 minutos (sucesso ✅)",
    },
  ]);

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      url: "",
      method: "POST",
      events: ["nova_conversa", "mensagem_recebida"],
      retryEnabled: true,
      maxAttempts: 3,
      retryIntervalSec: 60,
      secretToken: "token_demo_123",
      headers: [
        { key: "Authorization", value: "Bearer token123" },
        { key: "Content-Type", value: "application/json" },
      ],
    },
  });

  const headersArray = useFieldArray({ control: form.control, name: "headers" });

  React.useEffect(() => {
    if (!open) {
      setCreating(false);
      form.reset();
    }
  }, [open, form]);

  const toggleEvent = (event: string) => {
    const current = form.getValues("events");
    form.setValue(
      "events",
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
      { shouldValidate: true },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Webhooks Personalizados</DialogTitle>
          <DialogDescription>Envie eventos em tempo real para suas aplicações</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista */}
          <div className="space-y-3">
            {webhooks.map((w) => (
              <Card key={w.id}>
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{w.url}</p>
                    <p className="text-xs text-muted-foreground">
                      Eventos: {w.events.join(", ")} • Última tentativa: {w.lastAttempt}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={w.active}
                        onCheckedChange={(v) =>
                          setWebhooks((prev) => prev.map((x) => (x.id === w.id ? { ...x, active: v } : x)))
                        }
                      />
                      <span className="text-xs text-muted-foreground">Ativo</span>
                    </div>
                    <Button type="button" variant="outline" onClick={() => toast({ title: "Editar (mock)" })}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toast({ title: "Evento de teste enviado (mock)" })}
                    >
                      <TestTube2 className="mr-2 h-4 w-4" />
                      Testar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        setWebhooks((prev) => prev.filter((x) => x.id !== w.id));
                        toast({ title: "Webhook excluído (mock)" });
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => setCreating((v) => !v)}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Fechar" : "Novo Webhook"}
            </Button>
          </div>

          {/* Form */}
          {creating ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novo Webhook</CardTitle>
                <CardDescription>HTTPS obrigatório. A assinatura é enviada no header X-Webhook-Signature.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit((values) => {
                      const id = `w${Math.random().toString(16).slice(2)}`;
                      setWebhooks((prev) => [
                        ...prev,
                        {
                          id,
                          url: values.url,
                          events: values.events,
                          active: true,
                          lastAttempt: "Agora (criado ✅)",
                        },
                      ]);
                      toast({ title: "✅ Webhook criado", description: "Um evento de teste pode ser enviado quando quiser." });
                      setCreating(false);
                      form.reset();
                    })}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>URL do Webhook *</FormLabel>
                            <FormControl>
                              <Input placeholder="https://seusite.com/webhook" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Método</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="GET">GET</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Eventos *</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {[
                            "nova_conversa",
                            "mensagem_recebida",
                            "mensagem_enviada",
                            "conversa_resolvida",
                            "contato_criado",
                            "contato_atualizado",
                            "automacao_iniciada",
                            "automacao_concluida",
                          ].map((evt) => (
                            <label key={evt} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={form.getValues("events").includes(evt)}
                                onCheckedChange={() => toggleEvent(evt)}
                              />
                              <span className="font-mono text-xs">
                                {evt === "automacao_iniciada"
                                  ? "zapfllow_iniciado"
                                  : evt === "automacao_concluida"
                                    ? "zapfllow_concluido"
                                    : evt}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-destructive">{form.formState.errors.events?.message as string}</p>
                      </div>
                    </div>

                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base">Headers personalizados</CardTitle>
                        <CardDescription>Informe pares chave/valor.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {headersArray.fields.map((f, idx) => (
                          <div key={f.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <FormField
                              control={form.control}
                              name={`headers.${idx}.key`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Header" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`headers.${idx}.value`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Valor" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="button" variant="outline" onClick={() => headersArray.remove(idx)}>
                              Remover
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => headersArray.append({ key: "", value: "" })}>
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Header
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="retryEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border p-3">
                            <div>
                              <FormLabel>Retentar em caso de falha</FormLabel>
                              <p className="text-xs text-muted-foreground">Aplicar retry automático (mock)</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="maxAttempts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Máx. tentativas</FormLabel>
                              <FormControl>
                                <Input type="number" inputMode="numeric" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="retryIntervalSec"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Intervalo (s)</FormLabel>
                              <FormControl>
                                <Input type="number" inputMode="numeric" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="secretToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secret Token</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Enviado no header <span className="font-mono">X-Webhook-Signature</span> para validação.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => toast({ title: "Evento de teste enviado (mock)" })}>
                        <TestTube2 className="mr-2 h-4 w-4" />
                        Testar Webhook
                      </Button>
                      <Button type="submit">
                        <Check className="mr-2 h-4 w-4" />
                        Criar Webhook
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const asaasSchema = z.object({
  apiKey: z.string().trim().min(10, "Informe uma API Key válida"),
  sandbox: z.boolean().default(false),
  autoPix: z.boolean().default(false),
  boletoDays: z.coerce.number().int().min(1).max(30).default(3),
});

type AsaasFormValues = z.infer<typeof asaasSchema>;

function ConnectAsaasDialog({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected: () => void;
}) {
  const [tested, setTested] = React.useState(false);

  const form = useForm<AsaasFormValues>({
    resolver: zodResolver(asaasSchema),
    defaultValues: { apiKey: "", sandbox: true, autoPix: false, boletoDays: 3 },
  });

  React.useEffect(() => {
    if (!open) {
      setTested(false);
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar Asaas</DialogTitle>
          <DialogDescription>Exemplo de integração de pagamento (mock).</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(() => {})}>
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key do Asaas</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0"
                    onClick={() => window.open("https://docs.asaas.com/", "_blank")}
                  >
                    Como obter minha API Key?
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sandbox"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel>Usar ambiente Sandbox</FormLabel>
                    <p className="text-xs text-muted-foreground">Recomendado para testes.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                const ok = await form.trigger();
                if (!ok) return;
                setTested(true);
                toast({ title: "✅ Conta Asaas conectada com sucesso!", description: "Teste de conexão (mock) aprovado." });
              }}
            >
              Testar Conexão
            </Button>

            {tested ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Configurações adicionais</CardTitle>
                  <CardDescription>Configurações aplicadas no ZapFllow (mock).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FormField
                    control={form.control}
                    name="autoPix"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel>Criar cobrança PIX automaticamente</FormLabel>
                          <p className="text-xs text-muted-foreground">Ao disparar ZapFllow de cobrança.</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="boletoDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias para vencimento de boleto</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-md border bg-muted/50 p-3 text-sm">
                    <p className="font-medium">Dados (mock)</p>
                    <p className="mt-1 text-muted-foreground">Saldo disponível: R$ 1.234,56 • Última transação: ontem</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!tested}
                onClick={() => {
                  onConnected();
                  toast({ title: "✅ Integração salva" });
                  onOpenChange(false);
                }}
              >
                Salvar Integração
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
