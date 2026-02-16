import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, MessageSquare, Paperclip, Send, Smile } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { WhatsAppConversation, WhatsAppMessage } from "@/types/whatsapp";
import { cn, formatTime } from "@/lib/utils";

interface ChatViewProps {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  onSendMessage: (message: string) => void;
  isSending: boolean;
}

export function ChatView({ conversation, messages, onSendMessage, isSending }: ChatViewProps) {
  const [messageText, setMessageText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const headerName = useMemo(
    () => conversation.contact?.name || conversation.contact?.phone || "Contato sem nome",
    [conversation],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant", block: "end" } as ScrollIntoViewOptions);
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || isSending) return;
    onSendMessage(messageText);
    setMessageText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {conversation.contact?.profile_picture_url ? (
              <AvatarImage src={conversation.contact.profile_picture_url} alt={headerName} />
            ) : null}
            <AvatarFallback>{(conversation.contact?.name?.substring(0, 2) || "WA").toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{headerName}</p>
            <p className="truncate text-xs text-muted-foreground">{conversation.contact?.phone || ""}</p>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center p-6">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">Envie a primeira mensagem para começar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {messages.map((message) => {
              const mine = message.is_from_me;
              const t = formatTime(message.timestamp);
              return (
                <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl border px-3 py-2 text-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-card",
                    )}
                  >
                    {/* Mídia */}
                    {message.media_url ? (
                      <div className="mb-2 overflow-hidden rounded-lg">
                        {message.message_type === "image" ? (
                          <img
                            src={message.media_url}
                            alt="Imagem enviada"
                            className="max-h-64 w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs underline-offset-4 hover:underline",
                              mine ? "text-primary-foreground/90" : "text-muted-foreground",
                            )}
                          >
                            <Image className="h-4 w-4" />
                            Abrir mídia
                          </a>
                        )}
                      </div>
                    ) : null}

                    {/* Texto */}
                    {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : null}

                    {/* Timestamp */}
                    <div className={cn("mt-1 text-right text-[10px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}> 
                      {t}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Button size="icon" variant="ghost" aria-label="Anexar" disabled>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Emoji" disabled>
            <Smile className="h-4 w-4" />
          </Button>

          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32 resize-none"
            placeholder="Digite uma mensagem..."
          />

          <Button onClick={handleSend} disabled={!messageText.trim() || isSending} size="icon" aria-label="Enviar">
            {isSending ? <Send className="h-5 w-5 opacity-50" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
