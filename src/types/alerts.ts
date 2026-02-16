export type AlertType =
  | "webhook_failure"
  | "high_latency"
  | "quota_exceeded"
  | "rate_limit_hit"
  | "circuit_breaker_open";

export type AlertChannel = "in_app"; // por enquanto só este canal é implementado

export type AlertConditions =
  | { consecutive_failures: number }
  | { threshold_ms: number; window_minutes: number }
  | { percentage: number }
  | { hits: number; window_minutes: number }
  | Record<string, any>;

export interface AlertConfigRow {
  id: string;
  user_id: string;
  name: string;
  alert_type: AlertType;
  conditions: Record<string, any>;
  channels: AlertChannel[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertHistoryRow {
  id: string;
  alert_config_id: string | null;
  user_id: string;
  triggered_at: string;
  severity: "info" | "warning" | "critical" | string;
  message: string;
  metadata: Record<string, any> | null;
}
