import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

type UptimePoint = {
  timestamp: string;
  successful: number;
  total: number;
  uptimePct: number;
};

type LatencyPercentiles = {
  p50: number;
  p95: number;
  p99: number;
};

function weightedUptime(points: UptimePoint[]): number {
  const totals = points.reduce(
    (acc, p) => {
      acc.successful += p.successful;
      acc.total += p.total;
      return acc;
    },
    { successful: 0, total: 0 },
  );
  if (!totals.total) return 0;
  return (totals.successful / totals.total) * 100;
}

export function useWebhookUptimeSeries(hours: number) {
  return useQuery({
    queryKey: ["system-health", "uptime-hourly", hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_uptime_hourly", {
        p_hours: hours,
      });
      if (error) throw error;

      return (data ?? []).map((row: any) =>
        ({
          timestamp: row.hour,
          successful: Number(row.successful ?? 0),
          total: Number(row.total ?? 0),
          uptimePct: Number(row.uptime_pct ?? 0),
        }) satisfies UptimePoint,
      );
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useWebhookUptimeDaily(days: number) {
  return useQuery({
    queryKey: ["system-health", "uptime-daily", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_uptime_daily", {
        p_days: days,
      });
      if (error) throw error;

      return (data ?? []).map((row: any) =>
        ({
          timestamp: row.day,
          successful: Number(row.successful ?? 0),
          total: Number(row.total ?? 0),
          uptimePct: Number(row.uptime_pct ?? 0),
        }) satisfies UptimePoint,
      );
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useWebhookLatencyPercentiles(minutes = 60) {
  return useQuery({
    queryKey: ["system-health", "latency", minutes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_webhook_latency_percentiles", {
        p_minutes: minutes,
      });
      if (error) throw error;

      const row = (data ?? [])[0] as any;
      return {
        p50: Number(row?.p50_latency_ms ?? 0),
        p95: Number(row?.p95_latency_ms ?? 0),
        p99: Number(row?.p99_latency_ms ?? 0),
      } satisfies LatencyPercentiles;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useSystemHealthRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("system-health-webhook-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "webhook_logs" },
        () => {
          // Mantém simples: invalida tudo que depende de logs de webhook.
          queryClient.invalidateQueries({ queryKey: ["system-health"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useSystemHealthDerived() {
  const uptime24h = useWebhookUptimeSeries(24);
  const uptime7d = useWebhookUptimeDaily(7);
  const uptime30d = useWebhookUptimeDaily(30);
  const latency = useWebhookLatencyPercentiles(60);

  const computed = useMemo(() => {
    const uptime24hPct = weightedUptime(uptime24h.data ?? []);
    const uptime7dPct = weightedUptime(uptime7d.data ?? []);
    const uptime30dPct = weightedUptime(uptime30d.data ?? []);

    return {
      uptime24hPct,
      uptime7dPct,
      uptime30dPct,
      latency: latency.data ?? { p50: 0, p95: 0, p99: 0 },
      loading: uptime24h.isLoading || uptime7d.isLoading || uptime30d.isLoading || latency.isLoading,
    };
  }, [latency.data, latency.isLoading, uptime24h.data, uptime24h.isLoading, uptime30d.data, uptime30d.isLoading, uptime7d.data, uptime7d.isLoading]);

  return {
    ...computed,
    series: {
      uptime24h: uptime24h.data ?? [],
      uptime7d: uptime7d.data ?? [],
      uptime30d: uptime30d.data ?? [],
    },
  };
}
