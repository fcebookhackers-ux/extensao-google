import { useMemo, useState } from "react";
import { Archive, MessageSquare, MoreVertical, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhatsAppConversation } from "@/types/whatsapp";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ConversationListProps {
  conversations: WhatsAppConversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  onArchiveConversation: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onArchiveConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conv) => {
      const contactName = conv.contact?.name?.toLowerCase() || "";
      const contactPhone = conv.contact?.phone?.toLowerCase() || "";
      return contactName.includes(query) || contactPhone.includes(query);
    });
  }, [conversations, searchQuery]);

  if (conversations.length === 0) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhuma conversa</p>
          <p className="mt-1 text-sm text-muted-foreground">Suas conversas do WhatsApp aparecerão aqui</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversas</h2>
          <Badge variant="secondary">{filteredConversations.length}</Badge>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada</div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const isSelected = selectedConversationId === conversation.id;
              const name = conversation.contact?.name || conversation.contact?.phone || "WhatsApp";
              const time = conversation.last_message_at ? formatRelativeTime(conversation.last_message_at) : "";
              const preview = conversation.last_message_content || "Sem mensagens";

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation)}
                  className={cn(
                    "w-full p-4 text-left transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      {conversation.contact?.profile_picture_url ? (
                        <AvatarImage src={conversation.contact.profile_picture_url} alt={name} />
                      ) : null}
                      <AvatarFallback>{(conversation.contact?.name?.substring(0, 2) || "WA").toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {conversation.last_message_from_me ? "Você: " : ""}
                          {preview}
                        </p>

                        {conversation.unread_count > 0 ? (
                          <Badge className="shrink-0" variant="default">
                            {conversation.unread_count}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Mais opções">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveConversation(conversation.id);
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
