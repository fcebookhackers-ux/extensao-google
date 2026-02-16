export type ConversationStatus = "novo_lead" | "em_atendimento" | "aguardando_cliente" | "resolvido" | "arquivado";
export type ConversationTag = "VIP" | "Urgente" | "Suporte" | "Vendas";

export interface ConversationListItem {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageAtLabel: string;
  unreadCount: number;
  online: boolean;
  assignedTo: "João Silva" | "Maria Santos" | "Eu" | null;
  tags: ConversationTag[];
  statusLabel: "Aberto" | "Resolvido";
  pinned?: boolean;
}

export type ChatMessageKind = "in" | "out" | "system";
export type ChatAttachmentKind = "image" | "audio" | "file" | "location";

export interface ChatAttachment {
  kind: ChatAttachmentKind;
  name?: string;
  sizeLabel?: string;
  url?: string;
  durationLabel?: string;
  address?: string;
}

export interface ChatMessage {
  id: string;
  kind: ChatMessageKind;
  authorLabel?: string; // ex: "João" | "Você" | "Bot"
  text?: string;
  time: string; // "14:32"
  dateLabel?: "Hoje" | "Ontem" | string;
  bot?: boolean;
  delivery?: "sent" | "delivered" | "read";
  attachment?: ChatAttachment;
}

export interface ConversationThread {
  id: string;
  contactName: string;
  contactOnline: boolean;
  tags: string[];
  lastSeenLabel?: string;
  messages: ChatMessage[];
}
