import * as React from "react";
import {
  Ban,
  Bot,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  CheckSquare,
  Lock,
  MessageCircle,
  MessageSquare,
  Phone,
  Star,
  Tag,
  User,
} from "lucide-react";

import type { ConversationStatus, ConversationThread } from "@/pages/dashboard/conversas/types";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

import { TransferConversationDialog } from "@/pages/dashboard/conversas/components/TransferConversationDialog";
import { ResolveConversationDialog } from "@/pages/dashboard/conversas/components/ResolveConversationDialog";
import { SendTemplateDialog } from "@/pages/dashboard/conversas/components/SendTemplateDialog";
import { AddToAutomationDialog } from "@/pages/dashboard/conversas/components/AddToAutomationDialog";
import { ContactProfileSheet } from "@/pages/dashboard/conversas/components/ContactProfileSheet";

type Variant = "panel" | "sheet";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function safeCopy(value: string) {
  if (!value) return;
  void navigator.clipboard?.writeText(value);
  toast({ title: "Copiado", description: value });
}

const teamMembers = [
  { id: "me", name: "João Silva", initials: "JS", online: true },
  { id: "ms", name: "Maria Santos", initials: "MS", online: true },
  { id: "co", name: "Carlos Oliveira", initials: "CO", online: false },
];

type InternalNote = {
  id: string;
  author: string;
  authorInitials: string;
  when: string;
  text: string;
};

type TimelineEvent = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  when: string;
};

type PreviousConversation = {
  id: string;
  dateLabel: string;
  preview: string;
  agent: string;
  statusLabel: "Resolvido" | "Aberto";
};

function CollapsibleCard({
  title,
  icon: Icon,
  countLabel,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  countLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none space-y-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                {countLabel ? (
                  <span className="truncate text-xs text-muted-foreground">{countLabel}</span>
                ) : null}
              </div>
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function SidebarBody({ thread }: { thread: ConversationThread | undefined }) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [resolveOpen, setResolveOpen] = React.useState(false);
  const [sendTemplateOpen, setSendTemplateOpen] = React.useState(false);
  const [automationOpen, setAutomationOpen] = React.useState(false);

  const [status, setStatus] = React.useState<ConversationStatus>("em_atendimento");
  const [assignedTo, setAssignedTo] = React.useState<string>("me");
  const [priority, setPriority] = React.useState(false);

  const [notes, setNotes] = React.useState<InternalNote[]>([
    {
      id: "n1",
      author: "Maria Santos",
      authorInitials: "MS",
      when: "Hoje às 10:15",
      text: "Cliente VIP, atenção especial com horários",
    },
    {
      id: "n2",
      author: "Carlos Oliveira",
      authorInitials: "CO",
      when: "Ontem",
      text: "Preferência por consultas de manhã",
    },
    {
      id: "n3",
      author: "João Silva",
      authorInitials: "JS",
      when: "15/01",
      text: "Validar se já recebeu opt-in para mensagens de marketing.",
    },
  ]);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteLoading, setNoteLoading] = React.useState(false);

  const timeline: TimelineEvent[] = React.useMemo(
    () => [
      { id: "t1", icon: MessageSquare, title: "Conversa iniciada", when: "Hoje às 14:25" },
      { id: "t2", icon: Bot, title: "Entrou no fluxo: Boas-vindas", when: "Hoje às 14:26" },
      { id: "t3", icon: User, title: "Atribuído para Você", when: "Hoje às 14:28" },
      { id: "t4", icon: Tag, title: "Tag adicionada: VIP", when: "Hoje às 14:30" },
      { id: "t5", icon: Calendar, title: "Consulta agendada: 31/01 às 10h", when: "Hoje às 14:37" },
      { id: "t6", icon: CheckCircle, title: "Conversa marcada como resolvida", when: "Hoje às 14:39" },
    ],
    [],
  );

  const previous: PreviousConversation[] = React.useMemo(
    () => [
      { id: "p1", dateLabel: "15 de Janeiro", preview: "Cliente perguntou sobre preços...", agent: "Maria Santos", statusLabel: "Resolvido" },
      { id: "p2", dateLabel: "10 de Janeiro", preview: "Agendamento solicitado para a próxima semana.", agent: "João Silva", statusLabel: "Resolvido" },
      { id: "p3", dateLabel: "06 de Janeiro", preview: "Dúvidas sobre horário de funcionamento.", agent: "Carlos Oliveira", statusLabel: "Resolvido" },
      { id: "p4", dateLabel: "02 de Janeiro", preview: "Solicitou alteração de data do pedido.", agent: "Maria Santos", statusLabel: "Resolvido" },
      { id: "p5", dateLabel: "28 de Dezembro", preview: "Primeiro contato via WhatsApp.", agent: "João Silva", statusLabel: "Aberto" },
    ],
    [],
  );

  const contact = React.useMemo(() => {
    const name = thread?.contactName ?? "—";
    if (name.toLowerCase().includes("joão")) {
      return {
        phone: "(11) 98765-4321",
        email: "joao.silva@gmail.com",
        tags: ["VIP", "Cliente"],
      };
    }
    return {
      phone: "(11) 90000-0000",
      email: "contato@email.com",
      tags: thread?.tags?.length ? thread.tags : ["Cliente"],
    };
  }, [thread]);

  const extras = React.useMemo(
    () => [
      { k: "Origem", v: "Bot - Boas-vindas" },
      { k: "Primeiro contato", v: "10 de Janeiro" },
      { k: "Total de mensagens", v: "47" },
      { k: "Última interação", v: "Hoje às 14:39" },
      { k: "Tempo médio de resposta", v: "2 minutos" },
      { k: "Conversas resolvidas", v: "4" },
      { k: "NPS/Satisfação", v: "★★★★★ (5.0)" },
    ],
    [],
  );

  const addNote = async () => {
    const text = noteDraft.trim();
    if (!text) return;
    setNoteLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setNotes((prev) => [
      {
        id: `n${prev.length + 1}`,
        author: "Maria Santos",
        authorInitials: "MS",
        when: "Agora",
        text,
      },
      ...prev,
    ]);
    setNoteDraft("");
    setNoteLoading(false);
    toast({ title: "Nota adicionada" });
  };

  if (!thread) {
    return <div className="text-sm text-muted-foreground">Selecione uma conversa para ver detalhes.</div>;
  }

  return (
    <div className="space-y-4">
      {/* SEÇÃO 1 - INFORMAÇÕES */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials(thread.contactName)}</AvatarFallback>
            </Avatar>
            <div className="mt-3 text-base font-semibold">{thread.contactName}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {thread.contactOnline ? "Online" : thread.lastSeenLabel ?? "Offline"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Telefone</div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{contact.phone}</div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" aria-label="Copiar telefone" onClick={() => safeCopy(contact.phone)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Ligar via WhatsApp" onClick={() => toast({ title: "Em breve", description: "Ligar via WhatsApp (feature futura)" })}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Enviar WhatsApp" onClick={() => toast({ title: "Em breve", description: "Abrir conversa no WhatsApp (feature futura)" })}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Email</div>
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-medium">{contact.email}</div>
              <Button size="icon" variant="ghost" aria-label="Copiar email" onClick={() => safeCopy(contact.email)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-muted-foreground">Tags</div>
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Em breve", description: "Adicionar tag (mock)" })}>
                + Adicionar Tag
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((t) => (
                <Badge key={t} variant="outline" className="font-mono text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          <Button className="w-full" variant="outline" onClick={() => setProfileOpen(true)}>
            Ver Perfil Completo
          </Button>
        </CardContent>
      </Card>

      {/* SEÇÃO 2 - STATUS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Status da Conversa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Status</div>
            <Select value={status} onValueChange={(v) => setStatus(v as ConversationStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novo_lead">Novo Lead</SelectItem>
                <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Atribuído a</div>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Atribuído a" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Não Atribuído</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 rounded-md border p-3">
            <Checkbox checked={priority} onCheckedChange={(v) => setPriority(!!v)} />
            <Star className={cn("h-4 w-4", priority ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm">Marcar como prioritário</span>
          </label>

          <div className="grid gap-2">
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              Transferir Conversa
            </Button>
            <Button onClick={() => setResolveOpen(true)}>Resolver Conversa</Button>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 3 - NOTAS */}
      <CollapsibleCard title="Anotações da Equipe" icon={Lock} countLabel={`${notes.length} notas`} defaultOpen>
        <div className="space-y-3">
          <div className="space-y-2">
            {notes.map((n) => {
              const isAuthor = n.author === "Maria Santos";
              return (
                <div key={n.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">{n.authorInitials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{n.author}</div>
                          <div className="text-xs text-muted-foreground">{n.when}</div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{n.text}</div>
                      </div>
                    </div>
                    {isAuthor ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toast({ title: "Editar", description: "Edição mock" })}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNotes((prev) => prev.filter((x) => x.id !== n.id));
                            toast({ title: "Nota removida" });
                          }}
                        >
                          Excluir
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Adicionar nota interna..."
              className="min-h-[88px]"
            />
            <div className="flex justify-end">
              {noteDraft.trim() ? (
                <Button disabled={noteLoading} onClick={addNote}>
                  {noteLoading ? "Adicionando..." : "Adicionar"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* SEÇÃO 4 - TIMELINE */}
      <CollapsibleCard title="Timeline" icon={Clock}>
        <div className="space-y-2">
          <div className="max-h-[240px] space-y-2 overflow-auto pr-1">
            {timeline.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 rounded-md border p-3">
                <div className="mt-0.5 rounded-md bg-muted p-2">
                  <ev.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{ev.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{ev.when}</div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full" onClick={() => toast({ title: "Carregar mais", description: "Timeline mock" })}>
            Carregar mais
          </Button>
        </div>
      </CollapsibleCard>

      {/* SEÇÃO 5 - CONVERSAS ANTERIORES */}
      <CollapsibleCard title="Histórico de Conversas" icon={MessageSquare} countLabel="5 conversas anteriores">
        <div className="space-y-2">
          {previous.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toast({ title: "Carregando conversa", description: "Abertura de conversa anterior (mock)" })}
              className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{p.dateLabel}</div>
                <Badge variant="outline" className={cn("h-5 px-2 text-[10px]", p.statusLabel === "Resolvido" ? "bg-primary/10 text-primary border-primary/30" : "bg-accent/60")}> 
                  {p.statusLabel}
                </Badge>
              </div>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.preview}</div>
              <div className="mt-2 text-xs text-muted-foreground">Atendente: {p.agent}</div>
            </button>
          ))}
        </div>
      </CollapsibleCard>

      {/* SEÇÃO 6 - EXTRAS */}
      <CollapsibleCard title="Informações Extras" icon={FileText}>
        <div className="space-y-2">
          {extras.map((x) => (
            <div key={x.k} className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="text-sm font-medium">{x.k}</div>
              <div className="text-right text-sm text-muted-foreground">{x.v}</div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* SEÇÃO 7 - AÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ações rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setSendTemplateOpen(true)}>
            <FileText className="h-4 w-4" /> Enviar Template
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setAutomationOpen(true)}>
            <Bot className="h-4 w-4" /> Adicionar ao ZapFllow
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => toast({ title: "Criar tarefa", description: "Modal de tarefa (mock)" })}
          >
            <CheckSquare className="h-4 w-4" /> Criar Tarefa
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => toast({ title: "Agendar follow-up", description: "DateTimePicker (mock)" })}
          >
            <Clock className="h-4 w-4" /> Agendar Follow-up
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start gap-2"
            onClick={() => toast({ title: "Bloquear contato", description: "Confirmação (mock)" })}
          >
            <Ban className="h-4 w-4" /> Bloquear Contato
          </Button>
        </CardContent>
      </Card>

      {/* Modais/Sheets */}
      <ContactProfileSheet open={profileOpen} onOpenChange={setProfileOpen} thread={thread} contact={contact} />
      <TransferConversationDialog open={transferOpen} onOpenChange={setTransferOpen} />
      <ResolveConversationDialog open={resolveOpen} onOpenChange={setResolveOpen} />
      <SendTemplateDialog open={sendTemplateOpen} onOpenChange={setSendTemplateOpen} contactName={thread.contactName} />
      <AddToAutomationDialog open={automationOpen} onOpenChange={setAutomationOpen} />
    </div>
  );
}

export function ConversationInfoSidebar({
  thread,
  variant = "panel",
  open,
  onOpenChange,
}: {
  thread: ConversationThread | undefined;
  variant?: Variant;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  if (variant === "sheet") {
    // For mobile, render as bottom sheet
    return (
      <Sheet open={!!open} onOpenChange={onOpenChange ?? (() => {})}>
        <SheetContent side="bottom" className="h-[90vh] p-0 md:hidden">
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle>Informações</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(90vh-56px)]">
            <div className="p-4">
              <SidebarBody thread={thread} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="text-sm font-semibold">Informações</div>
        <div className="mt-1 text-xs text-muted-foreground">Contato e conversa</div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <SidebarBody thread={thread} />
        </div>
      </ScrollArea>
    </div>
  );
}
