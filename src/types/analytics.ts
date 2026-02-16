export type AnalyticsEventType =
  | "whatsapp.connected"
  | "contacts.imported"
  | "automation.created"
  | "automation.activated"
  | "automation.paused"
  | "automation.published"
  | "message.sent"
  | "message.delivered"
  | "message.read"
  | "message.replied"
  | "message.failed"
  // Funis de conversão / adoção (permitidos para tracking e visualização)
  | "signup_completed"
  | "automation.created"
  | "automation.published"
  | "webhook.executed"
  | "feature.viewed"
  | "feature.clicked"
  | "feature.completed";

export interface AnalyticsEvent {
  id: string;
  created_at: string;
  user_id: string;
  event_type: AnalyticsEventType;
  event_properties: Record<string, any>;
  session_id: string | null;
  automation_id: string | null;
  contact_id: string | null;
}

export interface FunnelMetrics {
  user_id: string;
  email: string;
  signup_date: string;
  whatsapp_connected: boolean;
  whatsapp_connected_at: string | null;
  contacts_imported: boolean;
  contacts_imported_at: string | null;
  automation_created: boolean;
  automation_created_at: string | null;
  automation_activated: boolean;
  automation_activated_at: string | null;
  first_message_sent: boolean;
  first_message_sent_at: string | null;
  total_messages_sent: number;
  active_automations_count: number;
}

export interface AutomationMetrics {
  automation_id: string;
  user_id: string;
  name: string;
  status: string;
  created_at: string;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_replied: number;
  messages_failed: number;
  unique_contacts_reached: number;
  last_activity_at: string | null;
}

export interface PerformanceMetrics {
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  errorRate: number;
}
