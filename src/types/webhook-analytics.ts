export interface WebhookAnalyticsSummary {
  webhookId: string;
  webhookName: string;
  url: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRatePercentage: number;
  avgResponseTimeMs: number;
  maxResponseTimeMs: number;
  firstDeliveryAt: string | null;
  lastDeliveryAt: string | null;
  circuitBreakerState: "closed" | "open" | "half_open" | null;
  consecutiveFailures: number | null;
}

export interface WebhookDeliveryTrend {
  deliveryDate: string;
  totalDeliveries: number;
  successful: number;
  failed: number;
  avgResponseTimeMs: number;
}

export interface TopEvent {
  eventType: string;
  eventCount: number;
  successfulCount: number;
  failedCount: number;
  lastTriggeredAt: string;
}

export interface StatusCodeDistribution {
  statusCode: number;
  count: number;
  percentage: number;
}

export type HealthStatus = "healthy" | "warning" | "critical" | "inactive";

export interface WebhookHealthCheck {
  webhookId: string;
  name: string;
  url: string;
  isActive: boolean;
  deliveries24h: number;
  failures24h: number;
  deliveries7d: number;
  failures7d: number;
  circuitState: "closed" | "open" | "half_open" | null;
  consecutiveFailures: number | null;
  healthStatus: HealthStatus;
}

export interface GlobalWebhookAnalytics {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  avgResponseTimeMs: number;
}
