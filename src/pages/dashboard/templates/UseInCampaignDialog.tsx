import * as React from "react";
import Papa from "papaparse";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { useWhatsAppInstance } from "@/hooks/useWhatsAppInstance";
import { normalizePhoneDigits } from "@/components/contacts/contact-utils";

import type { MessageTemplate } from "./templatesMock";
import { DateTimePicker } from "./components/DateTimePicker";

const Schema = z.object({
  campaignName: z.string().trim().min(3, "Informe um nome").max(80, "Máximo 80 caracteres"),
  recipientsMode: z.enum(["all", "tags", "upload"]),
  scheduleMode: z.enum(["now", "schedule"]),
  scheduleAt: z.date().optional(),

  intervalSeconds: z.coerce.number().min(1).max(30).optional(),
  errorTolerancePct: z.coerce.number().min(1).max(100).optional(),
  reportEmail: z.boolean().optional(),
});

type Values = z.infer<typeof Schema>;

function extractVars(text: string) {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return Array.from(new Set(matches)).sort((a, b) => a - b);
}

type Recipient = {
  id?: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  custom_fields?: Record<string, unknown> | null;
  fields?: Record<string, string>;
};

type UploadRecipient = {
  phone: string;
  name?: string;
  email?: string;
  fields: Record<string, string>;
};

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickHeader(headers: string[], predicate: (normalized: string) => boolean) {
  for (const h of headers) {
    if (predicate(normalizeHeader(h))) return h;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderTemplateBody(
  body: string,
  varMap: Record<number, { mode: "name" | "email" | "custom" | "fixed"; fixed?: string; customKey?: string }>,
  recipient: Recipient,
) {
  return body.replace(/\{\{(\d+)\}\}/g, (_, raw) => {
    const key = Number(raw);
    const map = varMap[key];
    if (!map) return "";
    if (map.mode === "name") return String(recipient.name ?? "");
    if (map.mode === "email") return String(recipient.email ?? "");
    if (map.mode === "fixed") return String(map.fixed?.trim() ?? "");
    if (map.mode === "custom") {
      const customKey = map.customKey?.trim();
      if (!customKey) return "";
      if (recipient.fields && customKey in recipient.fields) return String(recipient.fields[customKey] ?? "");
      if (recipient.custom_fields && typeof recipient.custom_fields === "object" && customKey in recipient.custom_fields) {
        return String((recipient.custom_fields as Record<string, unknown>)[customKey] ?? "");
      }
      return "";
    }
    return "";
  }).trim();
}

export function UseInCampaignDialog({
  template,
  onOpenChange,
}: {
  template: MessageTemplate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const open = !!template;
  const vars = React.useMemo(() => (template ? extractVars(template.content.body) : []), [template]);

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      campaignName: "",
      recipientsMode: "all",
      scheduleMode: "now",
      scheduleAt: undefined,
      intervalSeconds: 2,
      errorTolerancePct: 10,
      reportEmail: false,
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedTags([]);
      setUploadFileName(null);
      setUploadRecipients([]);
      setUploadError(null);
      setRecipientsCount(null);
      setSendStats({ total: 0, sent: 0, failed: 0, status: "" });
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { workspaceId } = useCurrentWorkspace();
  const { instance } = useWhatsAppInstance(workspaceId ?? undefined);

  const [availableTags, setAvailableTags] = React.useState<string[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [uploadFileName, setUploadFileName] = React.useState<string | null>(null);
  const [uploadRecipients, setUploadRecipients] = React.useState<UploadRecipient[]>([]);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [recipientsCount, setRecipientsCount] = React.useState<number | null>(null);
  const [counting, setCounting] = React.useState(false);

  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sendStats, setSendStats] = React.useState({ total: 0, sent: 0, failed: 0, status: "" });

  const [varMap, setVarMap] = React.useState<
    Record<number, { mode: "name" | "email" | "custom" | "fixed"; fixed?: string; customKey?: string }>
  >({});

  const v = form.watch();

  const sampleContact = React.useMemo(() => ({ name: "Ana", email: "ana@exemplo.com" }), []);

  const resolveVarPreview = (n: number) => {
    const m = varMap[n];
    if (!m) return "—";
    if (m.mode === "name") return sampleContact.name;
    if (m.mode === "email") return sampleContact.email;
    if (m.mode === "fixed") return m.fixed?.trim() || "—";
    if (m.mode === "custom") return m.customKey ? `Campo: ${m.customKey}` : "(campo customizado)";
    return "—";
  };

  React.useEffect(() => {
    if (!workspaceId) {
      setAvailableTags([]);
      return;
    }

    let cancelled = false;
    const loadTags = async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("tags")
        .eq("workspace_id", workspaceId);
      if (error || !data || cancelled) return;

      const tagSet = new Set<string>();
      for (const row of data) {
        const tags = (row as { tags?: string[] | null })?.tags ?? [];
        for (const t of tags) {
          if (t?.trim()) tagSet.add(t.trim());
        }
      }
      const list = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
      setAvailableTags(list);
      setSelectedTags((prev) => prev.filter((t) => list.includes(t)));
    };

    loadTags();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const toggleTag = React.useCallback((tag: string, checked: boolean) => {
    setSelectedTags((prev) => {
      if (checked) {
        return prev.includes(tag) ? prev : [...prev, tag];
      }
      return prev.filter((t) => t !== tag);
    });
  }, []);

  React.useEffect(() => {
    if (!workspaceId) {
      setRecipientsCount(null);
      return;
    }

    const mode = v.recipientsMode;
    let cancelled = false;
    const countRecipients = async () => {
      setCounting(true);
      try {
        if (mode === "upload") {
          if (!cancelled) setRecipientsCount(uploadRecipients.length);
          return;
        }

        let query = supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .not("phone", "is", null);

        if (mode === "tags") {
          if (!selectedTags.length) {
            if (!cancelled) setRecipientsCount(0);
            return;
          }
          query = query.overlaps("tags", selectedTags);
        }

        const { count, error } = await query;
        if (error) throw error;
        if (!cancelled) setRecipientsCount(count ?? 0);
      } catch {
        if (!cancelled) setRecipientsCount(null);
      } finally {
        if (!cancelled) setCounting(false);
      }
    };

    countRecipients();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, v.recipientsMode, selectedTags, uploadRecipients]);

  const parseUploadFile = React.useCallback(async (file: File) => {
    setUploadError(null);
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    const headers = (result.meta.fields ?? []).filter(Boolean);
    if (!headers.length) {
      setUploadRecipients([]);
      setUploadError("Arquivo sem cabeçalho. Inclua colunas como telefone e nome.");
      return;
    }

    const phoneHeader = pickHeader(headers, (h) => h.includes("telefone") || h.includes("celular") || h.includes("whatsapp") || h.includes("phone"));
    if (!phoneHeader) {
      setUploadRecipients([]);
      setUploadError("Coluna de telefone não encontrada. Use um cabeçalho como telefone, celular, whatsapp ou phone.");
      return;
    }

    const nameHeader = pickHeader(headers, (h) => h.includes("nome") || h.includes("name"));
    const emailHeader = pickHeader(headers, (h) => h.includes("e-mail") || h.includes("email"));

    const recipients: UploadRecipient[] = (result.data ?? [])
      .map((row) => {
        const fields: Record<string, string> = {};
        for (const h of headers) fields[h] = String((row as any)?.[h] ?? "");
        const rawPhone = fields[phoneHeader] ?? "";
        const phone = normalizePhoneDigits(rawPhone);
        if (!phone) return null;
        return {
          phone,
          name: nameHeader ? fields[nameHeader] : undefined,
          email: emailHeader ? fields[emailHeader] : undefined,
          fields,
        };
      })
      .filter(Boolean) as UploadRecipient[];

    setUploadRecipients(recipients);
  }, []);

  const loadRecipients = React.useCallback(async (): Promise<Recipient[]> => {
    if (!workspaceId) throw new Error("Workspace não selecionado");

    if (v.recipientsMode === "upload") {
      return uploadRecipients.map((r) => ({
        phone: r.phone,
        name: r.name ?? null,
        email: r.email ?? null,
        fields: r.fields,
      }));
    }

    let query = supabase
      .from("contacts")
      .select("id, name, phone, email, custom_fields, tags")
      .eq("workspace_id", workspaceId)
      .not("phone", "is", null);

    if (v.recipientsMode === "tags") {
      if (!selectedTags.length) return [];
      query = query.overlaps("tags", selectedTags);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? [])
      .map((row) => ({
        id: row.id as string,
        phone: row.phone ?? "",
        name: row.name ?? null,
        email: row.email ?? null,
        custom_fields: (row as any).custom_fields ?? null,
      }))
      .filter((r) => normalizePhoneDigits(r.phone));
  }, [workspaceId, v.recipientsMode, selectedTags, uploadRecipients]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (sending) return;
    if (!template) return;
    if (!workspaceId) {
      toast({ title: "Workspace não selecionado", description: "Selecione um workspace antes de enviar." });
      return;
    }
    if (!instance || instance.status !== "connected") {
      toast({ title: "WhatsApp não conectado", description: "Conecte o WhatsApp antes de enviar campanhas." });
      return;
    }

    if (data.scheduleMode === "schedule" && !data.scheduleAt) {
      toast({ title: "Informe data e horário" });
      return;
    }

    setSending(true);
    try {
      const recipients = await loadRecipients();
      if (!recipients.length) {
        toast({ title: "Nenhum contato encontrado", description: "Ajuste os filtros ou envie um CSV válido." });
        return;
      }

      const total = recipients.length;
      setSendStats({ total, sent: 0, failed: 0, status: "Preparando envio..." });

      if (data.scheduleMode === "schedule" && data.scheduleAt) {
        const delayMs = data.scheduleAt.getTime() - Date.now();
        if (delayMs > 0) {
          setSendStats({ total, sent: 0, failed: 0, status: "Aguardando horário..." });
          await sleep(delayMs);
        }
      }

      const intervalMs = Math.max(1, data.intervalSeconds ?? 1) * 1000;
      const errorTolerance = Math.max(1, data.errorTolerancePct ?? 100);
      let sent = 0;
      let failed = 0;

      for (let i = 0; i < recipients.length; i += 1) {
        const recipient = recipients[i]!;
        const to = normalizePhoneDigits(recipient.phone);
        const message = renderTemplateBody(template.content.body, varMap, recipient);

        if (!to || !message) {
          failed += 1;
          setSendStats({ total, sent, failed, status: "Enviando..." });
          continue;
        }

        const { error } = await supabase.functions.invoke("evolution-send-message", {
          body: {
            instanceId: instance.id,
            to,
            message,
          },
        });

        if (error) failed += 1;
        else sent += 1;

        setSendStats({ total, sent, failed, status: "Enviando..." });

        const failurePct = total ? (failed / total) * 100 : 0;
        if (failurePct > errorTolerance) {
          throw new Error(`Taxa de erro acima do limite (${Math.round(failurePct)}%)`);
        }

        if (i < recipients.length - 1) {
          await sleep(intervalMs);
        }
      }

      setSendStats((prev) => ({ ...prev, status: "Concluído" }));

      if (failed > 0) {
        toast({
          title: "Campanha finalizada com falhas",
          description: `${sent} enviados • ${failed} falharam`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Campanha enviada com sucesso!", description: `${sent} mensagens enviadas.` });
      }

      if (data.reportEmail) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        if (userId) {
          const { error: reportError } = await supabase
            .from("analytics_events")
            .insert({
              user_id: userId,
              event_type: "campaign.sent",
              event_properties: {
                campaign_name: data.campaignName,
                template: template.name,
                total,
                sent,
                failed,
                schedule_mode: data.scheduleMode,
              },
            })
            .select("id")
            .single();
          if (reportError) {
            console.warn("Falha ao salvar relatório de campanha", reportError);
          }
        }
      }

      onOpenChange(false);
      navigate("/dashboard/campanhas");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Falha ao enviar campanha", description: message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Campanha com Template</DialogTitle>
        </DialogHeader>

        {template ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Template selecionado</p>
                  <p className="text-sm text-muted-foreground">{template.name}</p>
                </div>
                <Badge variant="outline" className="w-fit font-mono">
                  {template.language}
                </Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{template.content.body}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Campanha</label>
                <Input placeholder="ex: Campanha Janeiro" {...form.register("campaignName")} />
                {form.formState.errors.campaignName ? (
                  <p className="text-sm font-medium text-destructive">{String(form.formState.errors.campaignName.message)}</p>
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Selecionar destinatários</p>
              <RadioGroup
                value={v.recipientsMode}
                onValueChange={(x) => form.setValue("recipientsMode", x as any, { shouldValidate: true })}
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="all" /> Todos os contatos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="tags" /> Tags específicas
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="upload" /> Upload lista (CSV)
                </label>
              </RadioGroup>

              {v.recipientsMode === "tags" ? (
                <div className="mt-3 grid gap-2 rounded-md border bg-muted/20 p-3">
                  {availableTags.length ? (
                    availableTags.map((tag) => (
                      <label key={tag} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={selectedTags.includes(tag)} onCheckedChange={(x) => toggleTag(tag, x === true)} />
                        {tag}
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma tag encontrada neste workspace.</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {counting ? "Calculando contatos..." : recipientsCount !== null ? `${recipientsCount} contatos selecionados` : "—"}
                  </p>
                </div>
              ) : null}

              {v.recipientsMode === "upload" ? (
                <div className="mt-3 rounded-md border bg-muted/20 p-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setUploadFileName(file?.name ?? null);
                      setUploadRecipients([]);
                      setUploadError(null);
                      if (file) void parseUploadFile(file);
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {uploadError
                      ? uploadError
                      : uploadFileName
                        ? `Arquivo: ${uploadFileName} • ${uploadRecipients.length} contatos`
                        : "Envie um CSV com números e variáveis."}
                  </p>
                </div>
              ) : null}
            </div>

            {vars.length ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preencher variáveis</p>
                  <div className="grid gap-3">
                    {vars.map((n) => {
                      const current = varMap[n]?.mode ?? "name";
                      return (
                        <div key={n} className="rounded-md border bg-muted/10 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Badge variant="outline" className="w-fit font-mono">
                              {`{{${n}}}`}
                            </Badge>

                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                              <Select
                                value={current}
                                onValueChange={(mode) =>
                                  setVarMap((prev) => ({
                                    ...prev,
                                    [n]: { mode: mode as any, fixed: prev[n]?.fixed, customKey: prev[n]?.customKey },
                                  }))
                                }
                              >
                                <SelectTrigger className="sm:w-56">
                                  <SelectValue placeholder="Mapear" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="name">Nome</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="custom">Campo customizado</SelectItem>
                                  <SelectItem value="fixed">Valor fixo</SelectItem>
                                </SelectContent>
                              </Select>

                              {current === "fixed" ? (
                                <Input
                                  className="sm:w-56"
                                  placeholder="Digite o valor"
                                  value={varMap[n]?.fixed ?? ""}
                                  onChange={(e) =>
                                    setVarMap((prev) => ({
                                      ...prev,
                                      [n]: { mode: "fixed", fixed: e.target.value, customKey: prev[n]?.customKey },
                                    }))
                                  }
                                />
                              ) : null}

                              {current === "custom" ? (
                                <Input
                                  className="sm:w-56"
                                  placeholder="Campo (ex: empresa)"
                                  value={varMap[n]?.customKey ?? ""}
                                  onChange={(e) =>
                                    setVarMap((prev) => ({
                                      ...prev,
                                      [n]: { mode: "custom", customKey: e.target.value, fixed: prev[n]?.fixed },
                                    }))
                                  }
                                />
                              ) : null}
                            </div>
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">
                            Preview (exemplo): <span className="font-medium">{resolveVarPreview(n)}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Agendar envio</p>
              <RadioGroup
                value={v.scheduleMode}
                onValueChange={(x) => form.setValue("scheduleMode", x as any, { shouldValidate: true })}
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="now" /> Enviar agora
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="schedule" /> Agendar
                </label>
              </RadioGroup>

              {v.scheduleMode === "schedule" ? (
                <div className="mt-3 rounded-md border bg-muted/20 p-3">
                  <DateTimePicker value={v.scheduleAt} onChange={(d) => form.setValue("scheduleAt", d, { shouldDirty: true })} />
                </div>
              ) : null}
            </div>

            <Separator />

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Configurações avançadas</p>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    {advancedOpen ? "Ocultar" : "Abrir"}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-3 rounded-md border bg-muted/20 p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Intervalo entre mensagens (s)</label>
                    <Input type="number" min={1} max={30} {...form.register("intervalSeconds")} />
                    <p className="text-xs text-muted-foreground">Padrão: 2s (evitar bloqueio)</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Pausar se taxa de erro &gt; (%)</label>
                    <Input type="number" min={1} max={100} {...form.register("errorTolerancePct")} />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!v.reportEmail} onCheckedChange={(x) => form.setValue("reportEmail", x === true)} />
                      Salvar relatório ao finalizar
                    </label>
                    <p className="text-xs text-muted-foreground">Resumo ficará registrado no histórico da conta.</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              <p className="mb-2 font-medium">Resumo</p>
              <div className="grid gap-1 text-muted-foreground">
                <p>Template: {template.name}</p>
                <p>
                  Destinatários:{" "}
                  {counting
                    ? "calculando..."
                    : recipientsCount !== null
                      ? `${recipientsCount} contatos`
                      : "—"}
                </p>
                <p>
                  Agendamento: {v.scheduleMode === "now" ? "Agora" : v.scheduleAt ? v.scheduleAt.toLocaleString() : "—"}
                </p>
                <p>Custo estimado: R$ 0,00 (incluso no plano)</p>
              </div>
            </div>
          </div>
        ) : null}

        {sending ? (
          <div className="rounded-lg border bg-muted/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{sendStats.status || "Enviando..."}</span>
              <span>
                {sendStats.sent + sendStats.failed}/{sendStats.total}
              </span>
            </div>
            <Progress
              className="mt-2"
              value={
                sendStats.total
                  ? ((sendStats.sent + sendStats.failed) / sendStats.total) * 100
                  : 0
              }
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Enviados: {sendStats.sent} • Falhas: {sendStats.failed}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={sending}>
            {v.scheduleMode === "schedule" ? "Agendar Campanha" : "Enviar Campanha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
