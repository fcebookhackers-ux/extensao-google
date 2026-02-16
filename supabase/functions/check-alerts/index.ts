/*
  check-alerts

  Avalia alertas configuráveis para o usuário autenticado e cria notificações in-app.
  Observação: sem service role, esta função só consegue avaliar alertas do próprio usuário.
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0?target=deno&deno-std=0.208.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AlertType =
  | "webhook_failure"
  | "high_latency"
  | "quota_exceeded"
  | "rate_limit_hit"
  | "circuit_breaker_open";

type AlertConfigRow = {
  id: string;
  user_id: string;
  name: string;
  alert_type: AlertType | string;
  conditions: Record<string, unknown>;
  channels: unknown;
  enabled: boolean;
};

function asNumber(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toIso(d: Date) {
  return d.toISOString();
}

function subMinutes(minutes: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

function subHours(hours: number) {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // IMPORTANT: signing-keys requires passing the JWT to getClaims(token)
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError) {
      console.error("check-alerts: getClaims error", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: configs, error: configsError } = await supabase
      .from("alert_configs")
      .select("id,user_id,name,alert_type,conditions,channels,enabled")
      .eq("user_id", userId)
      .eq("enabled", true);

    if (configsError) throw configsError;

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ ok: true, checked: 0, triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup webhook ids for this user (used by multiple alert types)
    const { data: webhooks, error: webhooksError } = await supabase
      .from("webhooks")
      .select("id")
      .eq("user_id", userId);
    if (webhooksError) throw webhooksError;

    const webhookIds = (webhooks ?? []).map((w: any) => String(w.id));

    let triggered = 0;
    const results: Array<{ alert_config_id: string; triggered: boolean; reason?: string }> = [];

    for (const cfg of configs as unknown as AlertConfigRow[]) {
      const cfgType = String(cfg.alert_type) as AlertType;

      // Debounce (1h)
      const { data: recentHistory, error: historyError } = await supabase
        .from("alert_history")
        .select("id")
        .eq("alert_config_id", cfg.id)
        .gt("triggered_at", toIso(subHours(1)))
        .limit(1);
      if (historyError) throw historyError;
      if ((recentHistory ?? []).length > 0) {
        results.push({ alert_config_id: cfg.id, triggered: false, reason: "debounced" });
        continue;
      }

      let shouldTrigger = false;
      let severity: "info" | "warning" | "critical" = "warning";
      let message = "";
      let notificationType:
        | "webhook_failure"
        | "webhook_circuit_open"
        | "storage_quota_warning"
        | "storage_quota_critical"
        | "system_announcement"
        | "security_alert" = "system_announcement";
      let priority: "low" | "medium" | "high" | "critical" = "medium";
      let metadata: Record<string, unknown> = { alert_type: cfgType, conditions: cfg.conditions ?? {} };

      if (cfgType === "webhook_failure") {
        const consecutive = asNumber((cfg.conditions as any)?.consecutive_failures, 5);
        if (webhookIds.length > 0) {
          const { data: logs, error: logsError } = await supabase
            .from("webhook_logs")
            .select("success,executed_at,webhook_id")
            .in("webhook_id", webhookIds)
            .order("executed_at", { ascending: false })
            .limit(consecutive);
          if (logsError) throw logsError;

          const last = logs ?? [];
          const failures = last.filter((l: any) => l.success === false || l.success === null);
          shouldTrigger = last.length === consecutive && failures.length === consecutive;
          if (shouldTrigger) {
            severity = "critical";
            priority = "high";
            notificationType = "webhook_failure";
            message = `Detectamos ${consecutive} falhas consecutivas em webhooks.`;
            metadata = { ...metadata, consecutive, sample: last };
          }
        }
      }

      if (cfgType === "high_latency") {
        const thresholdMs = asNumber((cfg.conditions as any)?.threshold_ms, 3000);
        const windowMinutes = asNumber((cfg.conditions as any)?.window_minutes, 5);
        if (webhookIds.length > 0) {
          const { data: slow, error: slowError } = await supabase
            .from("webhook_logs")
            .select("duration_ms,executed_at,webhook_id")
            .in("webhook_id", webhookIds)
            .gt("executed_at", toIso(subMinutes(windowMinutes)))
            .gt("duration_ms", thresholdMs)
            .order("executed_at", { ascending: false })
            .limit(1);
          if (slowError) throw slowError;
          shouldTrigger = (slow ?? []).length > 0;
          if (shouldTrigger) {
            severity = "warning";
            priority = "medium";
            notificationType = "system_announcement";
            message = `Latência alta detectada (>${thresholdMs}ms) nos últimos ${windowMinutes} minutos.`;
            metadata = { ...metadata, threshold_ms: thresholdMs, window_minutes: windowMinutes, sample: slow };
          }
        }
      }

      if (cfgType === "quota_exceeded") {
        const pct = asNumber((cfg.conditions as any)?.percentage, 90);
        const { data: quota, error: quotaError } = await supabase
          .from("user_storage_quotas")
          .select("total_size_bytes,max_size_bytes")
          .eq("user_id", userId)
          .single();
        if (quotaError) throw quotaError;
        const used = Number((quota as any)?.total_size_bytes ?? 0);
        const max = Number((quota as any)?.max_size_bytes ?? 0);
        const percentage = max > 0 ? (used / max) * 100 : 0;
        shouldTrigger = percentage >= pct;
        if (shouldTrigger) {
          severity = percentage >= 95 ? "critical" : "warning";
          priority = severity === "critical" ? "high" : "medium";
          notificationType = severity === "critical" ? "storage_quota_critical" : "storage_quota_warning";
          message = `Uso de storage em ${percentage.toFixed(1)}% (limite do alerta: ${pct}%).`;
          metadata = { ...metadata, percentage, threshold_percentage: pct, used_bytes: used, max_bytes: max };
        }
      }

      if (cfgType === "rate_limit_hit") {
        const hits = asNumber((cfg.conditions as any)?.hits, 3);
        const windowMinutes = asNumber((cfg.conditions as any)?.window_minutes, 5);
        const { count, error: rlError } = await supabase
          .from("rate_limit_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gt("created_at", toIso(subMinutes(windowMinutes)));
        if (rlError) throw rlError;
        const c = count ?? 0;
        shouldTrigger = c >= hits;
        if (shouldTrigger) {
          severity = "warning";
          priority = "medium";
          notificationType = "security_alert";
          message = `Rate limit atingido ${c}x nos últimos ${windowMinutes} minutos.`;
          metadata = { ...metadata, hits, window_minutes: windowMinutes, count: c };
        }
      }

      if (cfgType === "circuit_breaker_open") {
        if (webhookIds.length > 0) {
          const { data: breakers, error: cbError } = await supabase
            .from("webhook_circuit_breaker")
            .select("state,opened_at,webhook_id")
            .in("webhook_id", webhookIds);
          if (cbError) throw cbError;
          const open = (breakers ?? []).find((b: any) => String(b.state ?? "").toLowerCase() === "open");
          shouldTrigger = Boolean(open);
          if (shouldTrigger) {
            severity = "critical";
            priority = "high";
            notificationType = "webhook_circuit_open";
            message = "Circuit breaker de webhook está aberto (open).";
            metadata = { ...metadata, sample: open };
          }
        }
      }

      if (!shouldTrigger) {
        results.push({ alert_config_id: cfg.id, triggered: false });
        continue;
      }

      // Persist history
      const { error: insertHistoryError } = await supabase.from("alert_history").insert({
        alert_config_id: cfg.id,
        user_id: userId,
        severity,
        message,
        metadata,
      });
      if (insertHistoryError) throw insertHistoryError;

      // Create in-app notification via SECURITY DEFINER RPC (notifications table has no INSERT policy)
      const { error: notifError } = await supabase.rpc("create_notification", {
        p_user_id: userId,
        p_type: notificationType,
        p_priority: priority,
        p_title: cfg.name,
        p_message: message,
        p_metadata: metadata,
        p_action_url: "/dashboard/notificacoes",
        p_action_label: "Ver inbox",
        p_expires_in_hours: 72,
      });
      if (notifError) throw notifError;

      triggered += 1;
      results.push({ alert_config_id: cfg.id, triggered: true });
    }

    return new Response(JSON.stringify({ ok: true, checked: configs.length, triggered, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("check-alerts error", error);
    return new Response(JSON.stringify({ error: String((error as any)?.message ?? error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
