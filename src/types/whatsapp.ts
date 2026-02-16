export interface WhatsAppInstance {
  id: string;
  workspace_id: string;
  instance_name: string;
  /** Evolution instance id (no banco costuma ser evolution_instance_id) */
  instance_id: string | null;
  qr_code: string | null;
  status: "disconnected" | "connecting" | "qr_ready" | "connected" | "error";
  phone_number: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  webhook_url: string | null;
  webhook_events: string[] | null;
  connected_at: string | null;
  last_seen_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  instance_id: string;
  workspace_id: string;
  contact_id: string | null;
  message_id: string;
  from_number: string;
  to_number: string;
  message_type:
    | "text"
    | "image"
    | "audio"
    | "video"
    | "document"
    | "sticker"
    | "location"
    | "contact";
  content: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  timestamp: string;
  is_from_me: boolean;
  processed: boolean;
  processed_at: string | null;
  automation_triggered: boolean;
  created_at: string;
}

export interface WhatsAppConversation {
  id: string;
  instance_id: string;
  workspace_id: string;
  contact_id: string;
  status: "active" | "archived" | "spam";
  unread_count: number;
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_from_me: boolean | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
    profile_picture_url?: string;
  };
}

export interface SendMessagePayload {
  instanceId: string;
  to: string;
  message: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "document";
}

/**
 * Helpers de compatibilidade (banco vs tipos da UI)
 * - whatsapp_instances.evolution_instance_id -> instance_id
 */
export function mapInstanceRow(row: any): WhatsAppInstance {
  return {
    ...row,
    instance_id: row?.instance_id ?? row?.evolution_instance_id ?? null,
  } as WhatsAppInstance;
}

/** - whatsapp_messages.whatsapp_instance_id -> instance_id */
export function mapMessageRow(row: any): WhatsAppMessage {
  return {
    ...row,
    instance_id: row?.instance_id ?? row?.whatsapp_instance_id,
  } as WhatsAppMessage;
}

/** - whatsapp_conversations.whatsapp_instance_id -> instance_id */
export function mapConversationRow(row: any): WhatsAppConversation {
  return {
    ...row,
    instance_id: row?.instance_id ?? row?.whatsapp_instance_id,
  } as WhatsAppConversation;
}
