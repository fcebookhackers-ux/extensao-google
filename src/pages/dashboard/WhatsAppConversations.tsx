import { useMemo, useState } from "react";
import { MessageSquare, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatView } from "@/components/whatsapp/ChatView";

import { useWhatsAppConversations } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessages";
import { useWhatsAppInstance } from "@/hooks/useWhatsAppInstance";
import type { WhatsAppConversation } from "@/types/whatsapp";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Modelo: instância global → sempre usar o workspace principal
const PRIMARY_WORKSPACE_ID = "e3946d71-98ec-4c08-9adb-9b6ed0e28e2d";

export default function WhatsAppConversations() {
  const navigate = useNavigate();
  const workspaceId = PRIMARY_WORKSPACE_ID;
  const { instance } = useWhatsAppInstance(workspaceId);

  const { conversations = [], isLoading: convLoading, error: convError, archiveConversation, markAsRead } =
    useWhatsAppConversations(workspaceId);

  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const selectedId = selectedConversation?.id;

  const { messages = [], isLoading: msgLoading, sendMessage } = useWhatsAppMessages(selectedId);
  const isSending = sendMessage.isPending;

  const listKey = useMemo(() => conversations.map((c) => c.id).join("|"), [conversations]);

  const handleSelectConversation = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    if (conversation.unread_count > 0) markAsRead.mutate(conversation.id);
  };

  const handleSendMessage = (message: string) => {
    if (!instance || !selectedConversation) return;
    sendMessage.mutate({
      instanceId: instance.id,
      to: selectedConversation.contact?.phone || "",
      message,
    });
  };

  const isConnected = instance?.status === "connected";

  // WhatsApp não conectado
  if (!instance || !isConnected) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <Card className="p-6">
          <div className="mx-auto grid max-w-md gap-3 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-base font-semibold">WhatsApp não conectado</h1>
            <p className="text-sm text-muted-foreground">
              Você precisa conectar sua conta do WhatsApp antes de acessar as conversas.
            </p>
            <Button onClick={() => navigate("/dashboard/whatsapp")}>Conectar WhatsApp</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (convLoading) {
    return (
      <div className="p-4">
        <Card className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando conversas...</span>
        </Card>
      </div>
    );
  }

  if (convError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar conversas</AlertTitle>
          <AlertDescription>{convError instanceof Error ? convError.message : "Erro desconhecido"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] p-0 md:p-4">
      <div className="grid h-full grid-rows-[1fr] gap-0 md:grid-cols-[360px_1fr] md:gap-4">
        <Card className="h-full overflow-hidden rounded-none border-0 md:rounded-lg md:border">
          <ConversationList
            key={listKey}
            conversations={conversations}
            selectedConversationId={selectedId}
            onSelectConversation={handleSelectConversation}
            onArchiveConversation={(id) => archiveConversation.mutate(id)}
          />
        </Card>

        <Card className="hidden h-full overflow-hidden rounded-lg md:block">
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              isSending={isSending}
            />
          ) : (
            <div className="grid h-full place-items-center p-6">
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Selecione uma conversa</p>
                <p className="mt-1 text-sm text-muted-foreground">Escolha uma conversa da lista para começar</p>
              </div>
            </div>
          )}
        </Card>

        {/* Mobile: quando seleciona conversa, mostra chat em tela cheia */}
        {selectedConversation ? (
          <div className="fixed inset-0 z-50 bg-background md:hidden">
            <div className="border-b p-3">
              <Button variant="outline" onClick={() => setSelectedConversation(null)}>
                Voltar
              </Button>
            </div>
            <div className="h-[calc(100vh-56px)]">
              <ChatView
                conversation={selectedConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                isSending={isSending}
              />
            </div>
          </div>
        ) : null}

        {/* Indicador de carregamento de mensagens */}
        {msgLoading && selectedConversation ? (
          <div className="pointer-events-none fixed bottom-4 right-4 hidden md:block">
            <BadgeLoading />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BadgeLoading() {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Carregando mensagens...
    </div>
  );
}
