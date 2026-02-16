import { useMemo } from "react";

import { DashboardPageShell } from "@/pages/dashboard/_DashboardPageShell";
import { HealthMetricCard } from "@/components/system-health/HealthMetricCard";
import { AlertsList, type HealthAlert } from "@/components/system-health/AlertsList";
import { HealthTimeline } from "@/components/system-health/HealthTimeline";
import type { SystemStatus } from "@/components/system-health/SystemStatusIndicator";
import { useSystemHealthDerived, useSystemHealthRealtime } from "@/hooks/useSystemHealth";
import { useQuotaUsage } from "@/hooks/useStorageQuota";
import { useRateLimitStatus } from "@/hooks/useRateLimit";

function statusFromThresholds({
  value,
  warn,
  critical,
  higherIsWorse,
}: {
  value: number;
  warn: number;
  critical: number;
  higherIsWorse: boolean;
}): SystemStatus {
  if (higherIsWorse) {
    if (value >= critical) return "critical";
    if (value >= warn) return "warning";
    return "healthy";
  }

  // lower is worse (ex: uptime)
  if (value <= critical) return "critical";
  if (value <= warn) return "warning";
  return "healthy";
}

function toSpark(points: { timestamp: string; uptimePct: number }[]) {
  return points.map((p) => ({ label: p.timestamp, value: p.uptimePct }));
}

export default function SystemHealth() {
  useSystemHealthRealtime();

  const health = useSystemHealthDerived();
  const quota = useQuotaUsage();
  const api = useRateLimitStatus("api.general");

  const uptime24Status = statusFromThresholds({
    value: health.uptime24hPct,
    warn: 98,
    critical: 95,
    higherIsWorse: false,
  });

  const latencyP95Status = statusFromThresholds({
    value: health.latency.p95,
    warn: 1500,
    critical: 3000,
    higherIsWorse: true,
  });

  const storagePct = quota?.percentage ?? 0;
  const storageStatus = statusFromThresholds({
    value: storagePct,
    warn: 80,
    critical: 95,
    higherIsWorse: true,
  });

  const apiRemaining = api.remaining;
  const apiStatus = statusFromThresholds({
    value: apiRemaining,
    warn: 25,
    critical: 5,
    higherIsWorse: false,
  });

  const alerts: HealthAlert[] = useMemo(() => {
    const list: HealthAlert[] = [];

    if (uptime24Status !== "healthy") {
      list.push({
        id: "uptime-24h",
        status: uptime24Status,
        title: "Uptime de webhooks (24h)",
        description: `Uptime atual: ${health.uptime24hPct.toFixed(2)}%`,
      });
    }

    if (latencyP95Status !== "healthy") {
      list.push({
        id: "latency-p95",
        status: latencyP95Status,
        title: "Latência elevada (P95)",
        description: `P95: ${Math.round(health.latency.p95)} ms`,
      });
    }

    if (storageStatus !== "healthy") {
      list.push({
        id: "storage",
        status: storageStatus,
        title: "Quota de storage", 
        description: `Uso: ${storagePct.toFixed(1)}%`,
      });
    }

    if (apiStatus !== "healthy") {
      list.push({
        id: "api-remaining",
        status: apiStatus,
        title: "API calls restantes", 
        description: `Restantes: ${apiRemaining}`,
      });
    }

    return list;
  }, [apiRemaining, apiStatus, health.latency.p95, health.uptime24hPct, latencyP95Status, storagePct, storageStatus, uptime24Status]);

  return (
    <DashboardPageShell
      title="Saúde do sistema"
      description="Monitoramento em tempo real (webhooks, latência, quotas e limites)."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HealthMetricCard
          title="Uptime (24h)"
          value={health.uptime24hPct}
          subtitle="Últimas 24h"
          status={uptime24Status}
          sparkline={toSpark(health.series.uptime24h)}
          valueFormatter={(v) => `${v.toFixed(2)}%`}
        />

        <HealthMetricCard
          title="Uptime (7d)"
          value={health.uptime7dPct}
          subtitle="Últimos 7 dias"
          status={statusFromThresholds({ value: health.uptime7dPct, warn: 98, critical: 95, higherIsWorse: false })}
          sparkline={toSpark(health.series.uptime7d)}
          valueFormatter={(v) => `${v.toFixed(2)}%`}
        />

        <HealthMetricCard
          title="Uptime (30d)"
          value={health.uptime30dPct}
          subtitle="Últimos 30 dias"
          status={statusFromThresholds({ value: health.uptime30dPct, warn: 98, critical: 95, higherIsWorse: false })}
          sparkline={toSpark(health.series.uptime30d)}
          valueFormatter={(v) => `${v.toFixed(2)}%`}
        />

        <HealthMetricCard
          title="Latência P50"
          value={health.latency.p50}
          subtitle="Últimos 60 min"
          status={statusFromThresholds({ value: health.latency.p50, warn: 800, critical: 1500, higherIsWorse: true })}
          sparkline={[
            { label: "P50", value: health.latency.p50 },
            { label: "P50", value: health.latency.p50 },
          ]}
          valueFormatter={(v) => `${Math.round(v)} ms`}
        />

        <HealthMetricCard
          title="Latência P95"
          value={health.latency.p95}
          subtitle="Últimos 60 min"
          status={latencyP95Status}
          sparkline={[
            { label: "P95", value: health.latency.p95 },
            { label: "P95", value: health.latency.p95 },
          ]}
          valueFormatter={(v) => `${Math.round(v)} ms`}
        />

        <HealthMetricCard
          title="Latência P99"
          value={health.latency.p99}
          subtitle="Últimos 60 min"
          status={statusFromThresholds({ value: health.latency.p99, warn: 2000, critical: 4000, higherIsWorse: true })}
          sparkline={[
            { label: "P99", value: health.latency.p99 },
            { label: "P99", value: health.latency.p99 },
          ]}
          valueFormatter={(v) => `${Math.round(v)} ms`}
        />

        <HealthMetricCard
          title="Quota de storage"
          value={storagePct}
          subtitle={quota ? `${(quota.used / (1024 ** 3)).toFixed(2)} GB / ${(quota.max / (1024 ** 3)).toFixed(2)} GB` : "—"}
          status={storageStatus}
          sparkline={[
            { label: "Uso", value: storagePct },
            { label: "Uso", value: storagePct },
          ]}
          valueFormatter={(v) => `${v.toFixed(1)}%`}
        />

        <HealthMetricCard
          title="API calls restantes"
          value={apiRemaining}
          subtitle={api.resetAt ? `Reset: ${api.resetAt.toLocaleTimeString()}` : "—"}
          status={apiStatus}
          sparkline={[
            { label: "Restantes", value: apiRemaining },
            { label: "Restantes", value: apiRemaining },
          ]}
          valueFormatter={(v) => `${Math.round(v)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AlertsList alerts={alerts} />
        <HealthTimeline />
      </div>
    </DashboardPageShell>
  );
}
