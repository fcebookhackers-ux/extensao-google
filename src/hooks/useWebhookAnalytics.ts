import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  GlobalWebhookAnalytics,
  WebhookAnalyticsSummary,
  WebhookDeliveryTrend,
  TopEvent,
  StatusCodeDistribution,
  WebhookHealthCheck,
} from "@/types/webhook-analytics";

type WebhookStatsByUser = {
  total_webhooks: number;
  active_webhooks: number;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  avg_response_time_ms: number;
};

export function useWebhookStatsByUser() {
  return useQuery({
    queryKey: ["webhook-stats-by-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("get_webhook_stats_by_user");
      if (error) throw error;

      const raw = (data ?? {}) as Partial<WebhookStatsByUser>;
      return {
        totalWebhooks: Number(raw.total_webhooks ?? 0),
        activeWebhooks: Number(raw.active_webhooks ?? 0),
        totalDeliveries: Number(raw.total_deliveries ?? 0),
        successfulDeliveries: Number(raw.successful_deliveries ?? 0),
        failedDeliveries: Number(raw.failed_deliveries ?? 0),
        successRate: Number(raw.success_rate ?? 0),
        avgResponseTimeMs: Number(raw.avg_response_time_ms ?? 0),
      } satisfies GlobalWebhookAnalytics;
    },
    refetchInterval: 60_000,
  });
}

export function useGlobalWebhookAnalytics() {
  return useQuery({
    queryKey: ["global-webhook-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_global_webhook_analytics");
      if (error) throw error;

      const raw = data as any;
      return {
        totalWebhooks: Number(raw.total_webhooks ?? 0),
        activeWebhooks: Number(raw.active_webhooks ?? 0),
        totalDeliveries: Number(raw.total_deliveries ?? 0),
        successfulDeliveries: Number(raw.successful_deliveries ?? 0),
        failedDeliveries: Number(raw.failed_deliveries ?? 0),
        successRate: Number(raw.success_rate ?? 0),
        avgResponseTimeMs: Number(raw.avg_response_time_ms ?? 0),
      } satisfies GlobalWebhookAnalytics;
    },
    refetchInterval: 30_000,
  });
}

export function useWebhookAnalyticsSummaries() {
  return useQuery({
    queryKey: ["webhook-analytics-summaries"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_analytics_summaries");
      if (error) throw error;

      return (data ?? []).map((row: any) =>
        ({
          webhookId: row.webhook_id,
          webhookName: row.webhook_name,
          url: row.url,
          totalDeliveries: Number(row.total_deliveries ?? 0),
          successfulDeliveries: Number(row.successful_deliveries ?? 0),
          failedDeliveries: Number(row.failed_deliveries ?? 0),
          successRatePercentage: Number(row.success_rate_percentage ?? 0),
          avgResponseTimeMs: Number(row.avg_response_time_ms ?? 0),
          maxResponseTimeMs: Number(row.max_response_time_ms ?? 0),
          firstDeliveryAt: row.first_delivery_at,
          lastDeliveryAt: row.last_delivery_at,
          circuitBreakerState: row.circuit_breaker_state,
          consecutiveFailures: row.consecutive_failures ? Number(row.consecutive_failures) : null,
        }) satisfies WebhookAnalyticsSummary,
      );
    },
    refetchInterval: 30_000,
  });
}

export function useWebhookAnalyticsSummary(webhookId: string) {
  return useQuery({
    queryKey: ["webhook-analytics-summary", webhookId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_analytics", {
        p_webhook_id: webhookId,
      });

      if (error) throw error;
      const row = data as any;
      return {
        webhookId: row.webhook_id,
        webhookName: row.webhook_name,
        url: row.url,
        totalDeliveries: Number(row.total_deliveries ?? 0),
        successfulDeliveries: Number(row.successful_deliveries ?? 0),
        failedDeliveries: Number(row.failed_deliveries ?? 0),
        successRatePercentage: Number(row.success_rate_percentage ?? 0),
        avgResponseTimeMs: Number(row.avg_response_time_ms ?? 0),
        maxResponseTimeMs: Number(row.max_response_time_ms ?? 0),
        firstDeliveryAt: row.first_delivery_at,
        lastDeliveryAt: row.last_delivery_at,
        circuitBreakerState: row.circuit_breaker_state,
        consecutiveFailures: row.consecutive_failures ? Number(row.consecutive_failures) : null,
      } satisfies WebhookAnalyticsSummary;
    },
    refetchInterval: 30_000,
  });
}

export function useWebhookDeliveryTrend(webhookId: string, days = 30) {
  return useQuery({
    queryKey: ["webhook-delivery-trend", webhookId, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_deliveries_by_day", {
        p_webhook_id: webhookId,
        p_days: days,
      });

      if (error) throw error;
      return (data ?? []).map((row: any) =>
        ({
          deliveryDate: row.delivery_date,
          totalDeliveries: Number(row.total_deliveries ?? 0),
          successful: Number(row.successful ?? 0),
          failed: Number(row.failed ?? 0),
          avgResponseTimeMs: Number(row.avg_response_time_ms ?? 0),
        }) satisfies WebhookDeliveryTrend,
      );
    },
  });
}

export function useTopEvents(webhookId: string, days = 30, limit = 10) {
  return useQuery({
    queryKey: ["webhook-top-events", webhookId, days, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_top_events", {
        p_webhook_id: webhookId,
        p_days: days,
        p_limit: limit,
      });

      if (error) throw error;
      return (data ?? []).map((row: any) =>
        ({
          eventType: row.event_type,
          eventCount: Number(row.event_count ?? 0),
          successfulCount: Number(row.successful_count ?? 0),
          failedCount: Number(row.failed_count ?? 0),
          lastTriggeredAt: row.last_triggered_at,
        }) satisfies TopEvent,
      );
    },
  });
}

export function useStatusCodeDistribution(webhookId: string, days = 30) {
  return useQuery({
    queryKey: ["webhook-status-distribution", webhookId, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_status_code_distribution", {
        p_webhook_id: webhookId,
        p_days: days,
      });

      if (error) throw error;
      return (data ?? []).map((row: any) =>
        ({
          statusCode: Number(row.status_code ?? 0),
          count: Number(row.count ?? 0),
          percentage: Number(row.percentage ?? 0),
        }) satisfies StatusCodeDistribution,
      );
    },
  });
}

export function useWebhooksHealthCheck() {
  return useQuery({
    queryKey: ["webhooks-health-check"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_health_check");
      if (error) throw error;

      return (data ?? []).map((row: any) =>
        ({
          webhookId: row.webhook_id,
          name: row.name,
          url: row.url,
          isActive: Boolean(row.is_active),
          deliveries24h: Number(row.deliveries_24h ?? 0),
          failures24h: Number(row.failures_24h ?? 0),
          deliveries7d: Number(row.deliveries_7d ?? 0),
          failures7d: Number(row.failures_7d ?? 0),
          circuitState: row.circuit_state,
          consecutiveFailures: row.consecutive_failures ? Number(row.consecutive_failures) : null,
          healthStatus: row.health_status as any,
        }) satisfies WebhookHealthCheck,
      );
    },
    refetchInterval: 60_000,
  });
}
