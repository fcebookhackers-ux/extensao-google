import * as React from "react";
import { BarChart, Copy, MessageCircle, MessageSquare, Send, Star, Trash2, UserRound } from "lucide-react";

import type { ContactRow, ContactTag } from "@/pages/dashboard/contactsMock";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { ConfirmDeleteContactDialog } from "@/components/contacts/ConfirmDeleteContactDialog";
import { normalizePhoneDigits, safeCopy } from "@/components/contacts/contact-utils";

function tagVariant(tag: ContactTag) {
  switch (tag) {
    case "VIP":
      return "secondary";
    case "Lead Quente":
      return "destructive";
    case "Cliente":
      return "default";
    case "Inativo":
      return "outline";
    default:
      return "secondary";
  }
}

const HISTORY_MOCK = [
  "27/01 14:32 - Mensagem recebida: 'Olá!'",
  "27/01 10:15 - Entrou no fluxo: Boas-vindas",
  "26/01 16:45 - Tag adicionada: VIP",
  "25/01 09:00 - Contato criado",
];

export function ContactDetailsSheet({
  open,
  onOpenChange,
  contact,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactRow | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [sendOpen, setSendOpen] = React.useState(false);
  const [message, setMessage] = React.useState("Olá! Mensagem de teste.");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");
  const [notes, setNotes] = React.useState<Array<{ text: string; author: string; at: string }>>([
    { text: "Cliente pediu retorno amanhã.", author: "Equipe", at: "Hoje" },
  ]);

  React.useEffect(() => {
    if (!open) {
      setSendOpen(false);
      setDeleteOpen(false);
      setAdvancedOpen(false);
    }
  }, [open]);

  if (!contact) return null;

  const phoneDigits = normalizePhoneDigits(contact.phone);
  const waUrl = `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(message)}`;

  const infoRow = (label: string, value?: string, extra?: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-background p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium">{value || "—"}</p>
      </div>
      {extra}
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Detalhes do Contato</SheetTitle>
            <SheetDescription>Informações e ações rápidas.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-base">{contact.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold">{contact.name}</h3>
                <button type="button" onClick={onToggleFavorite} className="text-muted-foreground hover:text-foreground">
                  <Star className={cn("h-4 w-4", contact.favorite && "fill-current")} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(contact.tags ?? []).length === 0 ? (
                  <Badge variant="outline" className="rounded-full">
                    Sem tags
                  </Badge>
                ) : (
                  contact.tags.map((t) => (
                    <Badge key={String(t)} variant={tagVariant(t)} className="rounded-full">
                      {t}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={onEdit} aria-label="Editar">
                <UserRound className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                aria-label="Excluir"
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="info" className="mt-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="conversations">Conversas</TabsTrigger>
              <TabsTrigger value="notes">Anotações</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-3">
              {infoRow(
                "Telefone",
                contact.phone,
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      safeCopy(contact.phone)
                        ?.then(() => toast({ title: "Copiado" }))
                        .catch(() => toast({ title: "Não foi possível copiar", variant: "destructive" }));
                    }}
                    aria-label="Copiar telefone"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" asChild aria-label="Enviar WhatsApp">
                    <a href={waUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </Button>
                </div>,
              )}

              {infoRow(
                "Email",
                contact.email,
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    safeCopy(contact.email)
                      ?.then(() => toast({ title: "Copiado" }))
                      .catch(() => toast({ title: "Não foi possível copiar", variant: "destructive" }));
                  }}
                  aria-label="Copiar email"
                >
                  <Copy className="h-4 w-4" />
                </Button>,
              )}

              {infoRow("CPF/CNPJ", contact.cpfCnpj)}
              {infoRow(
                "Aniversário",
                contact.birthDate ? new Date(contact.birthDate).toLocaleDateString("pt-BR") : undefined,
              )}
              {infoRow("Endereço", contact.address)}
              {infoRow("Observações", contact.notes)}

              <Button variant="outline" onClick={onEdit} className="w-full">
                Editar Informações
              </Button>
            </TabsContent>

            <TabsContent value="history" className="mt-4 space-y-3">
              <div className="space-y-2">
                {HISTORY_MOCK.map((t) => (
                  <div key={t} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-muted" />
                    <p className="text-sm text-muted-foreground">{t}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => toast({ title: "Em breve", description: "Paginação do histórico." })}>
                Carregar mais
              </Button>
            </TabsContent>

            <TabsContent value="conversations" className="mt-4 space-y-3">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Últimas conversas</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Preview das últimas conversas (mock).</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a href={`/dashboard/conversas/${contact.id}`}>Ver conversa completa</a>
              </Button>
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3">
              <div className="space-y-2">
                {notes.map((n, idx) => (
                  <div key={idx} className="rounded-lg border bg-background p-3">
                    <p className="text-sm">{n.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.author} • {n.at}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Adicionar nova anotação" />
                <Button
                  variant="outline"
                  onClick={() => {
                    const t = noteText.trim();
                    if (!t) return;
                    setNotes((prev) => [{ text: t, author: "Equipe", at: "Agora" }, ...prev]);
                    setNoteText("");
                    toast({ title: "Anotação adicionada" });
                  }}
                >
                  Adicionar anotação
                </Button>
                <p className="text-xs text-muted-foreground">Visível apenas para equipe (MVP: simulado).</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  Detalhes técnicos
                  <span className="text-xs text-muted-foreground">{advancedOpen ? "Ocultar" : "Mostrar"}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {infoRow("Última sincronização", "Há 2 minutos")}
                {infoRow("Mensagens na fila", "0")}
                {infoRow("Latência", "45ms")}
                {infoRow("Bateria do dispositivo", "87%")}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <SheetFooter className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={() => setSendOpen(true)}
            >
              <Send className="h-4 w-4" />
              Enviar Mensagem
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
                onClick={() => toast({ title: "Em breve", description: "Adicionar ao ZapFllow." })}
            >
              <BarChart className="h-4 w-4" />
                Adicionar ao ZapFllow
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Envie uma mensagem para este contato (simulado).</p>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast({ title: "Mensagem enviada", description: "Simulação do MVP." });
                setSendOpen(false);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteContactDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          onDelete();
          setDeleteOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
