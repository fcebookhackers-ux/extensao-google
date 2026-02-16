import * as React from "react";
import type { DateRange } from "react-day-picker";
import {
  Check,
  CheckCheck,
  Filter,
  Info,
  MessageSquare,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  Search,
  Send,
  Smile,
  MessageCircle,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-mobile";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { conversationsMock, quickRepliesMock, threadJoaoSilva } from "@/pages/dashboard/conversas/mockData";
import type { ConversationListItem, ConversationTag, ConversationThread, ConversationStatus } from "@/pages/dashboard/conversas/types";
import { DateRangePicker } from "@/pages/dashboard/conversas/components/DateRangePicker";
import { NewConversationDialog } from "@/pages/dashboard/conversas/components/NewConversationDialog";
import { ConversationInfoSidebar } from "@/pages/dashboard/conversas/components/ConversationInfoSidebar";
import { VirtualList } from "@/pages/dashboard/conversas/components/VirtualList";

type ListTab = "all" | "unread" | "open" | "resolved" | "assigned_to_me";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function tagBadgeClass(tag: ConversationTag) {
  switch (tag) {
    case "VIP":
      return "bg-secondary/20 text-secondary-foreground border-secondary/40";
    case "Urgente":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "Suporte":
      return "bg-accent/50";
    case "Vendas":
      return "bg-primary/10 text-primary border-primary/30";
  }
}

function statusBadgeClass(status: ConversationListItem["statusLabel"]) {
  return status === "Resolvido"
    ? "bg-primary/10 text-primary border-primary/30"
    : "bg-accent/60 text-foreground border-border";
}

function systemPillClass(text: string) {
  const t = text.toLowerCase();
  if (t.includes("bot")) return "bg-secondary/15 text-secondary-foreground border-secondary/30";
  if (t.includes("assumiu") || t.includes("entrou")) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground";
}

function conversationStatusForAdvancedFilters(item: ConversationListItem): ConversationStatus {
  if (item.statusLabel === "Resolvido") return "resolvido";
  if (item.unreadCount > 0) return "novo_lead";
  return "em_atendimento";
}

function clampLastMessage(s: string) {
  return s.length > 50 ? s.slice(0, 50) + "…" : s;
}

export function ConversationsPage() {
  const isMobile = useIsMobile();

  const [activeId, setActiveId] = React.useState<string | null>("c1");
  const [threads] = React.useState<Record<string, ConversationThread>>({ c1: threadJoaoSilva });
  const activeThread = activeId ? threads[activeId] : undefined;

  const [infoOpen, setInfoOpen] = React.useState(true);
  const [infoSheetOpen, setInfoSheetOpen] = React.useState(false);

  const [listTab, setListTab] = React.useState<ListTab>("open");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [advOpen, setAdvOpen] = React.useState(false);
  const [advStatus, setAdvStatus] = React.useState<"all" | ConversationStatus>("all");
  const [advAssignedTo, setAdvAssignedTo] = React.useState<
    "all" | "unassigned" | "João Silva" | "Maria Santos" | "me"
  >("all");
  const [advTag, setAdvTag] = React.useState<"all" | ConversationTag>("all");
  const [advPeriod, setAdvPeriod] = React.useState<DateRange | undefined>(undefined);

  const [newConvOpen, setNewConvOpen] = React.useState(false);

  const [draft, setDraft] = React.useState("");
  const [quickReplyQ, setQuickReplyQ] = React.useState("");
  const canSend = draft.trim().length > 0;

  const counts = React.useMemo(
    () => ({ all: 45, unread: 8, open: 18, resolved: 20, assignedToMe: 5 }),
    [],
  );

  const filteredConversations = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let items = conversationsMock.slice();
    items.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

    if (listTab === "unread") items = items.filter((c) => c.unreadCount > 0);
    if (listTab === "open") items = items.filter((c) => c.statusLabel === "Aberto");
    if (listTab === "resolved") items = items.filter((c) => c.statusLabel === "Resolvido");
    if (listTab === "assigned_to_me") items = items.filter((c) => c.assignedTo === "Eu");

    if (q) {
      items = items.filter((c) => {
        const hay = `${c.name} ${c.lastMessage} ${(c.tags ?? []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (advStatus !== "all") items = items.filter((c) => conversationStatusForAdvancedFilters(c) === advStatus);
    if (advAssignedTo !== "all") {
      if (advAssignedTo === "unassigned") items = items.filter((c) => !c.assignedTo);
      else if (advAssignedTo === "me") items = items.filter((c) => c.assignedTo === "Eu");
      else items = items.filter((c) => c.assignedTo === advAssignedTo);
    }
    if (advTag !== "all") items = items.filter((c) => c.tags.includes(advTag));
    void advPeriod;

    return items;
  }, [debouncedSearch, listTab, advAssignedTo, advStatus, advTag, advPeriod]);

  const quickRepliesFiltered = React.useMemo(() => {
    const q = quickReplyQ.trim().toLowerCase();
    if (!q) return quickRepliesMock;
    return quickRepliesMock.filter((r) => `${r.title} ${r.text}`.toLowerCase().includes(q));
  }, [quickReplyQ]);

  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const autosize = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 5 * 24 + 16)}px`;
  }, []);

  React.useEffect(() => {
    autosize();
  }, [draft, autosize]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeId]);

  React.useEffect(() => {
    // desktop (>1024px): aberto por padrão; tablet: fechado por padrão
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    setInfoOpen(w >= 1024);
  }, []);

  return (
    <div className="h-[calc(100vh-56px-32px)] min-h-[520px]">
      <div className="grid h-full grid-cols-1 overflow-hidden rounded-lg border bg-card md:grid-cols-12">
        {/* SIDEBAR */}
        <aside className="border-r bg-background md:col-span-4">
          <div className="flex h-full flex-col">
            <div className="border-b p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold leading-none">Conversas</div>
                  <div className="mt-1 text-xs text-muted-foreground">18 ativas</div>
                </div>

                <div className="flex items-center gap-1">
                  <Popover open={advOpen} onOpenChange={setAdvOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Filtros">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[340px]">
                      <div className="space-y-3">
                        <div className="text-sm font-semibold">Filtros avançados</div>

                        <div className="grid gap-2">
                          <div className="text-xs font-medium text-muted-foreground">Status</div>
                          <Select value={advStatus} onValueChange={(v) => setAdvStatus(v as any)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
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
                          <Select value={advAssignedTo} onValueChange={(v) => setAdvAssignedTo(v as any)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Atribuído a" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="unassigned">Não Atribuído</SelectItem>
                              <SelectItem value="João Silva">João Silva</SelectItem>
                              <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                              <SelectItem value="me">Eu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <div className="text-xs font-medium text-muted-foreground">Tag</div>
                          <Select value={advTag} onValueChange={(v) => setAdvTag(v as any)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Tag" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              <SelectItem value="VIP">VIP</SelectItem>
                              <SelectItem value="Urgente">Urgente</SelectItem>
                              <SelectItem value="Suporte">Suporte</SelectItem>
                              <SelectItem value="Vendas">Vendas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <div className="text-xs font-medium text-muted-foreground">Período</div>
                          <DateRangePicker value={advPeriod} onChange={setAdvPeriod} className="w-full" />
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={() => setAdvOpen(false)}>Aplicar Filtros</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Mais">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Marcar todas como lidas</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Exportar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-3">
                <Tabs value={listTab} onValueChange={(v) => setListTab(v as ListTab)}>
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="all">Todas ({counts.all})</TabsTrigger>
                    <TabsTrigger value="unread" className="gap-2">
                      Não Lidas ({counts.unread})
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                        {counts.unread}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="open">Abertas ({counts.open})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidas ({counts.resolved})</TabsTrigger>
                    <TabsTrigger value="assigned_to_me">Atribuídas a Mim ({counts.assignedToMe})</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversas..." className="pl-9" />
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <VirtualList
                items={filteredConversations}
                rowHeight={86}
                className="h-full"
                renderRow={(c) => {
                  const selected = c.id === activeId;
                  return (
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "group flex w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors",
                        selected ? "bg-brand-primary-lighter/60" : "hover:bg-muted",
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar>
                          <AvatarFallback>{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                            c.online ? "bg-brand-primary-light" : "bg-muted-foreground/40",
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className={cn("truncate", c.unreadCount ? "font-semibold" : "font-medium")}>{c.name}</div>
                          <div className="shrink-0 text-xs text-muted-foreground">{c.lastMessageAtLabel}</div>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-sm text-muted-foreground">{clampLastMessage(c.lastMessage)}</div>
                          {c.unreadCount ? (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground">
                              {c.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {c.tags.slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline" className={cn("h-5 px-2 text-[10px]", tagBadgeClass(t))}>
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex w-[92px] shrink-0 flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageCircle className="h-4 w-4 text-brand-primary-light" />
                          {c.pinned ? <Pin className="h-4 w-4" /> : null}
                        </div>
                        <Badge variant="outline" className={cn("h-5 px-2 text-[10px]", statusBadgeClass(c.statusLabel))}>
                          {c.statusLabel}
                        </Badge>
                      </div>

                      {selected ? <span className="ml-[-12px] h-full w-1 rounded-full bg-brand-primary-light" /> : null}
                    </button>
                  );
                }}
              />
            </div>

            <div className="border-t p-3">
              <Button className="w-full" onClick={() => setNewConvOpen(true)}>
                + Iniciar Nova Conversa
              </Button>
            </div>
          </div>
        </aside>

        {/* CHAT */}
        <main className={cn("border-r bg-whatsapp-chat", infoOpen ? "md:col-span-5" : "md:col-span-8")}>
          {!activeThread ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-lg font-semibold">Selecione uma conversa</div>
              <div className="text-sm text-muted-foreground">Escolha uma conversa da lista ou inicie uma nova</div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials(activeThread.contactName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{activeThread.contactName}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "inline-flex h-2 w-2 rounded-full",
                          activeThread.contactOnline ? "bg-brand-primary-light" : "bg-muted-foreground/40",
                        )}
                      />
                      <span className="truncate">
                        {activeThread.contactOnline ? "Online" : activeThread.lastSeenLabel ?? "Offline"}
                      </span>
                    </div>
                  </div>
                  <div className="hidden flex-wrap gap-2 md:flex">
                    {activeThread.tags.map((t) => (
                      <Badge key={t} variant="outline" className="h-5 px-2 text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isMobile ? "Ver info" : infoOpen ? "Ocultar info" : "Mostrar info"}
                    onClick={() => (isMobile ? setInfoSheetOpen(true) : setInfoOpen((v) => !v))}
                    disabled={!activeThread}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Buscar na conversa">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Ligar" disabled>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Atribuir para...</DropdownMenuItem>
                      <DropdownMenuItem>Adicionar Tag</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Marcar como Resolvido</DropdownMenuItem>
                      <DropdownMenuItem>Arquivar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Bloquear Contato</DropdownMenuItem>
                      <DropdownMenuItem>Exportar Conversa</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-4">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
                  {activeThread.messages.map((m, idx) => {
                    if (m.kind === "system" && (m.text === "Hoje" || m.text === "Ontem" || m.text?.includes("de"))) {
                      return (
                        <div key={m.id} className="flex justify-center py-2">
                          <Badge variant="outline" className="bg-background/80">
                            {m.text}
                          </Badge>
                        </div>
                      );
                    }

                    if (m.kind === "system") {
                      return (
                        <div key={m.id} className="flex justify-center py-2">
                          <Badge variant="outline" className={cn("border", systemPillClass(m.text ?? ""))}>
                            {m.text}
                          </Badge>
                        </div>
                      );
                    }

                    const prev = activeThread.messages[idx - 1];
                    const next = activeThread.messages[idx + 1];
                    const sameAsNext = next && next.kind === m.kind && (next.kind === "in" || next.kind === "out");
                    const showAvatar = !sameAsNext && m.kind === "in";

                    const isIn = m.kind === "in";
                    return (
                      <div key={m.id} className={cn("flex items-end gap-2", isIn ? "justify-start" : "justify-end")}>
                        {isIn ? (
                          <div className="w-8 shrink-0">
                            {showAvatar ? (
                              <Avatar>
                                <AvatarFallback>{initials(activeThread.contactName)}</AvatarFallback>
                              </Avatar>
                            ) : null}
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            "group relative max-w-[65%] rounded-lg px-3 py-2 shadow-sm",
                            isIn ? "bg-whatsapp-bubble" : "bg-brand-primary-lighter",
                          )}
                        >
                          {m.text ? <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div> : null}
                          <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            {m.bot ? (
                              <Badge
                                variant="outline"
                                className="h-4 bg-secondary/15 px-1.5 text-[10px] border-secondary/30"
                              >
                                Bot
                              </Badge>
                            ) : null}
                            <span>{m.time}</span>
                            {!isIn ? (
                              <span className="inline-flex items-center">
                                {m.delivery === "sent" ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <CheckCheck
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      m.delivery === "read" ? "text-brand-primary" : "text-muted-foreground",
                                    )}
                                  />
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t bg-background p-3">
                <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Anexar">
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>Imagem</DropdownMenuItem>
                      <DropdownMenuItem>Vídeo</DropdownMenuItem>
                      <DropdownMenuItem>Arquivo</DropdownMenuItem>
                      <DropdownMenuItem>Áudio</DropdownMenuItem>
                      <DropdownMenuItem>Localização</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="ghost" size="icon" aria-label="Emoji">
                    <Smile className="h-5 w-5" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Respostas rápidas">
                        <Zap className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[320px] p-2">
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input value={quickReplyQ} onChange={(e) => setQuickReplyQ(e.target.value)} placeholder="Buscar atalho..." className="pl-9" />
                        </div>
                        <div className="max-h-[260px] overflow-auto">
                          {quickRepliesFiltered.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                              onClick={() => setDraft((d) => (d ? d + "\n" + r.text : r.text))}
                            >
                              <div className="text-sm font-medium">{r.title}</div>
                              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.text}</div>
                            </button>
                          ))}
                          <button type="button" className="w-full rounded-md px-2 py-2 text-left hover:bg-muted">
                            <div className="text-sm font-medium">+ Criar novo atalho</div>
                          </button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="flex-1">
                    <Textarea
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Digite uma mensagem..."
                      className="min-h-[44px] resize-none"
                      rows={1}
                    />
                  </div>

                  {canSend ? (
                    <Button size="icon" className="h-10 w-10 rounded-full" onClick={() => setDraft("")} aria-label="Enviar">
                      <Send className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" aria-label="Gravar áudio" disabled>
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* INFO */}
        {infoOpen ? (
          <aside className="hidden bg-background md:col-span-3 md:block">
            <ConversationInfoSidebar thread={activeThread} />
          </aside>
        ) : null}
      </div>

      {/* Mobile info */}
      <ConversationInfoSidebar
        thread={activeThread}
        variant="sheet"
        open={infoSheetOpen}
        onOpenChange={setInfoSheetOpen}
      />

      <NewConversationDialog open={newConvOpen} onOpenChange={setNewConvOpen} />
    </div>
  );
}
