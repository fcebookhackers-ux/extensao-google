export type NotificationType =
  | "webhook_failure"
  | "webhook_circuit_open"
  | "storage_quota_warning"
  | "storage_quota_critical"
  | "media_processing_complete"
  | "media_processing_failed"
  | "system_announcement"
  | "security_alert";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

// Mantemos snake_case para casar com o retorno do Supabase
export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, any> | null;
  read: boolean;
  read_at: string | null;
  archived: boolean;
  archived_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export type EmailDigestFrequency = "realtime" | "daily" | "weekly" | "never";

export interface NotificationPreferencesRow {
  id: string;
  user_id: string;

  webhook_failure_enabled: boolean;
  webhook_circuit_open_enabled: boolean;
  storage_quota_warning_enabled: boolean;
  storage_quota_critical_enabled: boolean;
  media_processing_complete_enabled: boolean;
  media_processing_failed_enabled: boolean;
  system_announcement_enabled: boolean;
  security_alert_enabled: boolean;

  email_notifications_enabled: boolean;
  email_digest_frequency: EmailDigestFrequency | string;

  created_at: string;
  updated_at: string;
}
