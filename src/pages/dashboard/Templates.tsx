import * as React from "react";
import { ExternalLink, Info, MoreHorizontal, Pencil, Copy, Send, Trash2, Ban, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { toast } from "@/hooks/use-toast";
import { templatesMock, type MessageTemplate, type TemplateCategory, type TemplateLanguage, type TemplateStatus } from "@/pages/dashboard/templates/templatesMock";
import { CreateTemplateDialog } from "@/pages/dashboard/templates/CreateTemplateDialog";
import { WhatsappGuidelinesDialog } from "@/pages/dashboard/templates/WhatsappGuidelinesDialog";
import { UseInCampaignDialog } from "@/pages/dashboard/templates/UseInCampaignDialog";
import { WhatsAppTemplatePreview } from "@/pages/dashboard/templates/components/WhatsAppTemplatePreview";

import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { useDeleteMessageTemplate, useMessageTemplates } from "@/hooks/useMessageTemplates";

type StatusTab = "all" | TemplateStatus;

function statusLabel(status: TemplateStatus) {
  switch (status) {
    case "approved":
      return "Aprovado ✅";
    case "pending":
      return "Pendente ⏳";
    case "rejected":
      return "Rejeitado ❌";
  }
}

function statusBadgeVariant(status: TemplateStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
      return "default";
    case "pending":
      return "secondary";
    case "rejected":
      return "destructive";
  }
}

function languageLabel(lang: TemplateLanguage) {
  switch (lang) {
    case "pt_BR":
      return "🇧🇷 pt_BR";
    case "es":
      return "🇪🇸 es";
    case "en":
      return "🇺🇸 en";
  }
}

function categoryLabel(cat: TemplateCategory) {
  switch (cat) {
    case "marketing":
      return "Marketing";
    case "utility":
      return "Utilidade";
    case "authentication":
      return "Autenticação";
  }
}

function extractVars(text: string) {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return Array.from(new Set(matches)).sort((a, b) => a - b);
}

function varLabel(template: MessageTemplate, n: number) {
  if (template.name === "confirmacao_agendamento") {
    if (n === 1) return "nome";
    if (n === 2) return "data";
    if (n === 3) return "hora";
  }
  return undefined;
}

export default function DashboardTemplates() {
  const [templates, setTemplates] = React.useState<MessageTemplate[]>(templatesMock);
  const [tab, setTab] = React.useState<StatusTab>("all");

  const internalTemplates = useMessageTemplates();
  const deleteInternal = useDeleteMessageTemplate();

  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<"all" | TemplateCategory>("all");
  const [language, setLanguage] = React.useState<"all" | TemplateLanguage>("all");
  const [sort, setSort] = React.useState<"recent" | "az" | "most_used">("recent");

  const [guidelinesOpen, setGuidelinesOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [campaignFor, setCampaignFor] = React.useState<MessageTemplate | null>(null);
  const [cantEditFor, setCantEditFor] = React.useState<MessageTemplate | null>(null);

  const counts = React.useMemo(() => {
    const approved = templates.filter((t) => t.status === "approved").length;
    const pending = templates.filter((t) => t.status === "pending").length;
    const rejected = templates.filter((t) => t.status === "rejected").length;
    return {
      all: templates.length,
      approved,
      pending,
      rejected,
    };
  }, [templates]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let items = templates.slice();

    if (tab !== "all") items = items.filter((t) => t.status === tab);
    if (category !== "all") items = items.filter((t) => t.category === category);
    if (language !== "all") items = items.filter((t) => t.language === language);
    if (query) {
      items = items.filter((t) => {
        const hay = `${t.name} ${t.description ?? ""} ${t.content.body}`.toLowerCase();
        return hay.includes(query);
      });
    }

    switch (sort) {
      case "recent":
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
      case "az":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "most_used":
        items.sort((a, b) => (b.stats?.usedInAutomations ?? 0) - (a.stats?.usedInAutomations ?? 0));
        break;
    }

    return items;
  }, [templates, tab, category, language, sort, q]);

  const onCreate = (created: MessageTemplate) => {
    setTemplates((prev) => [created, ...prev]);
    setCreateOpen(false);
    setTab("pending");
    toast({
      title: "Template enviado para aprovação!",
      description: "Aguarde 24-48h.",
    });
  };

  const onDuplicate = (t: MessageTemplate) => {
    const now = new Date().toISOString();
    const copy: MessageTemplate = {
      ...t,
      id: `tmp_${crypto.randomUUID()}`,
      status: "pending",
      name: `${t.name}_v2`,
      updatedAt: now,
      createdAt: now,
      meta: { ...t.meta, pendingSinceHours: 0 },
    };
    setTemplates((prev) => [copy, ...prev]);
    setTab("pending");
    toast({ title: "Template duplicado", description: "Criamos uma nova versão em Pendente." });
  };

  const onDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Template excluído" });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates de Mensagens</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie templates aprovados para campanhas em massa</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => setCreateOpen(true)}>+ Criar Template</Button>
          <Button variant="outline" onClick={() => setGuidelinesOpen(true)}>
            <ExternalLink className="h-4 w-4" /> Diretrizes WhatsApp
          </Button>
        </div>
      </header>

      <Alert className="border-primary/25 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          <p>
            Templates precisam ser aprovados pelo WhatsApp antes de enviar campanhas em massa. Tempo médio de aprovação:
            24-48h
          </p>
        </AlertDescription>
      </Alert>

      {/* Builder (templates rápidos com variáveis nomeadas) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Templates rápidos (Editor + Preview)</h2>
          <p className="text-sm text-muted-foreground">
            Crie templates internos com variáveis nomeadas (ex.: {"{{nome}}"}) e salve no Supabase.
          </p>
        </div>

        <TemplateEditor />

        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Meus templates salvos</p>
              <p className="text-xs text-muted-foreground">Clique em “Copiar” para usar em mensagens/fluxos.</p>
            </div>
            <div className="text-xs text-muted-foreground">
              {internalTemplates.isLoading ? "Carregando..." : `${internalTemplates.data?.length ?? 0} itens`}
            </div>
          </div>

          {internalTemplates.isError ? (
            <div className="mt-3 text-sm text-muted-foreground">Não foi possível carregar seus templates.</div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(internalTemplates.data ?? []).map((t) => (
              <Card key={t.id} className="overflow-hidden">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{t.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.description ?? "—"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Copiar conteúdo"
                        onClick={() => {
                          navigator.clipboard?.writeText(t.body).catch(() => {});
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Excluir template"
                        className="text-destructive"
                        disabled={deleteInternal.isPending}
                        onClick={() => deleteInternal.mutate({ id: t.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {(t.variables ?? []).length ? (
                    <div className="flex flex-wrap gap-2">
                      {t.variables.slice(0, 8).map((v) => (
                        <Badge key={v} variant="outline" className="font-mono">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                      {t.variables.length > 8 ? (
                        <Badge variant="outline" className="font-mono">
                          +{t.variables.length - 8}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </CardHeader>

                <CardContent>
                  <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ✅ ({counts.approved})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ⏳ ({counts.pending})</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitados ❌ ({counts.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4">
          {/* Filtros */}
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar templates..." />
            </div>

            <div className="md:col-span-3">
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="utility">Utilidade</SelectItem>
                  <SelectItem value="authentication">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="az">A-Z</SelectItem>
                  <SelectItem value="most_used">Mais usados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          <section className="grid gap-4 md:grid-cols-2">
            {filtered.map((t) => {
              const vars = extractVars(t.content.body);
              return (
                <Card key={t.id} className="overflow-hidden">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusBadgeVariant(t.status)}>{statusLabel(t.status)}</Badge>
                        <Badge variant="outline" className="bg-accent/40">
                          {categoryLabel(t.category)}
                        </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              if (t.status === "approved") {
                                setCantEditFor(t);
                                return;
                              }
                              toast({ title: "Editar", description: "(mock) Abra o editor no próximo passo." });
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicate(t)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={t.status !== "approved"}
                            onClick={() => {
                              if (t.status === "approved") setCampaignFor(t);
                            }}
                          >
                            <Send className="mr-2 h-4 w-4" /> Enviar Campanha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(t.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div>
                      <p className="text-lg font-semibold leading-snug">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Idioma: {languageLabel(t.language)}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {t.status === "rejected" ? (
                      <Alert variant="destructive" className="bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Rejeitado pelo WhatsApp</AlertTitle>
                        <AlertDescription>
                          <p className="mb-2">Motivo: {t.meta?.rejectionReason ?? "Motivo não informado."}</p>
                          <Button variant="link" className="h-auto p-0" onClick={() => setGuidelinesOpen(true)}>
                            Ler Diretrizes
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {t.status === "pending" ? (
                      <Alert className="border-secondary/40 bg-secondary/10">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Aguardando aprovação do WhatsApp</AlertTitle>
                        <AlertDescription>
                          <p>Enviado há {t.meta?.pendingSinceHours ?? 18} horas</p>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <WhatsAppTemplatePreview
                      header={t.content.header}
                      body={t.content.body}
                      footer={t.content.footer}
                      buttons={t.content.buttons}
                    />

                    {vars.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Variáveis detectadas</p>
                        <div className="flex flex-wrap gap-2">
                          {vars.map((n) => {
                            const label = varLabel(t, n);
                            return (
                              <Badge key={n} variant="outline" className="font-mono">
                                {`{{${n}}}`}{label ? ` = ${label}` : ""}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {t.stats ? (
                      <div className="grid gap-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Usado em</span>
                          <span className="font-medium">{t.stats.usedInAutomations} ZapFllow</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Envios (30d)</span>
                          <span className="font-medium">{t.stats.sentLast30d}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Taxa de entrega</span>
                          <span className="font-medium">{t.stats.deliveryRatePct}%</span>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {t.status === "approved" ? (
                      <>
                        <Button className="w-full sm:w-auto" onClick={() => setCampaignFor(t)}>
                          Usar em Campanha
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setCantEditFor(t);
                          }}
                        >
                          Editar
                        </Button>
                      </>
                    ) : null}

                    {t.status === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => toast({ title: "Cancelado", description: "(mock) Aprovação cancelada." })}
                        >
                          <Ban className="h-4 w-4" /> Cancelar Aprovação
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => toast({ title: "Detalhes", description: "(mock) Detalhes de submissão." })}
                        >
                          Ver Detalhes
                        </Button>
                      </>
                    ) : null}

                    {t.status === "rejected" ? (
                      <>
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => toast({ title: "Corrigir", description: "(mock) Abrir modo editar." })}
                        >
                          Corrigir e Reenviar
                        </Button>
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => onDelete(t.id)}>
                          Excluir
                        </Button>
                      </>
                    ) : null}
                  </CardFooter>
                </Card>
              );
            })}
          </section>
        </TabsContent>
      </Tabs>

      <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={onCreate} />
      <WhatsappGuidelinesDialog open={guidelinesOpen} onOpenChange={setGuidelinesOpen} />
      <UseInCampaignDialog
        template={campaignFor}
        onOpenChange={(open) => {
          if (!open) setCampaignFor(null);
        }}
      />

      <Dialog open={!!cantEditFor} onOpenChange={(open) => (!open ? setCantEditFor(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edição restrita</DialogTitle>
            <DialogDescription>
              Templates aprovados não podem ser editados. Você pode duplicar e criar uma nova versão.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCantEditFor(null)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                if (cantEditFor) onDuplicate(cantEditFor);
                setCantEditFor(null);
              }}
            >
              Duplicar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
