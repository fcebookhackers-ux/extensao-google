import type { NotificationPriority, NotificationType } from "@/types/notifications";

export function priorityLabel(priority: NotificationPriority) {
  switch (priority) {
    case "critical":
      return "Crítica";
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
    default:
      return "Média";
  }
}

export function typeLabel(type: NotificationType) {
  switch (type) {
    case "webhook_failure":
      return "Webhooks";
    case "webhook_circuit_open":
      return "Circuit breaker";
    case "storage_quota_warning":
    case "storage_quota_critical":
      return "Storage";
    case "media_processing_complete":
    case "media_processing_failed":
      return "Mídia";
    case "system_announcement":
      return "Sistema";
    case "security_alert":
      return "Segurança";
    default:
      return "Notificação";
  }
}

export function priorityVariant(priority: NotificationPriority): "default" | "secondary" | "destructive" | "outline" {
  if (priority === "critical") return "destructive";
  if (priority === "high") return "default";
  return "secondary";
}
