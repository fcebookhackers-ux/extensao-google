// Limpeza automática de dados expirados (retenção)
// - Exports (7 dias): remove do Storage e marca request como expired
// - Webhook logs (90 dias)
// - Rate limit events (30 dias)
// - Audit events (365 dias)
// - Uploads órfãos no bucket media-library
// - Registra métricas em public.cleanup_metrics

import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

async function removeInBatches(admin: any, bucket: string, paths: string[], batchSize = 100) {
  let deleted = 0;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize).filter(Boolean);
    if (batch.length === 0) continue;
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw error;
    deleted += batch.length;
  }
  return deleted;
}

async function listAllStoragePaths(admin: any, bucket: string) {
  // Lista recursivamente, devolvendo caminhos completos (relativos ao bucket).
  const files: string[] = [];
  const dirs: string[] = [""]; // prefixos
  const seenDirs = new Set<string>();

  while (dirs.length) {
    const prefix = dirs.shift()!;
    if (seenDirs.has(prefix)) continue;
    seenDirs.add(prefix);

    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, {
        limit,
        offset,
      });
      if (error) throw error;
      const items = data ?? [];
      for (const it of items as any[]) {
        // Heurística: pastas normalmente vêm com metadata null e sem mimetype.
        const name = String(it.name ?? "");
        if (!name) continue;

        const fullPath = prefix ? `${prefix}/${name}` : name;
        const isFolder = !!it.id === false && (it.metadata == null) && (it.mimetype == null);
        if (isFolder) {
          dirs.push(fullPath);
        } else {
          files.push(fullPath);
        }
      }

      if (items.length < limit) break;
      offset += limit;

      // Proteção básica contra loops/volumes extremos
      if (offset > 20000) break;
    }

    if (files.length > 50000) break;
  }

  return files;
}

async function runCleanup() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const runAt = new Date();

  async function getGlobalRetentionDays(entityType: string, fallbackDays: number) {
    try {
      const { data, error } = await admin
        .from("data_retention_policies")
        .select("retention_days")
        .eq("entity_type", entityType)
        .is("apply_to_workspace_id", null)
        .eq("is_global", true)
        .maybeSingle();
      if (error) throw error;
      const days = Number((data as any)?.retention_days);
      return Number.isFinite(days) && days > 0 ? days : fallbackDays;
    } catch {
      return fallbackDays;
    }
  }

  // Cria registro inicial
  const { data: metricRow, error: metricInsErr } = await admin
    .from("cleanup_metrics")
    .insert({
      run_at: runAt.toISOString(),
      status: "running",
      details: { started_at: runAt.toISOString() },
    })
    .select("id")
    .single();
  if (metricInsErr) throw metricInsErr;
  const metricId = String((metricRow as any)?.id);

  const counters = {
    deleted_exports_count: 0,
    deleted_webhook_logs_count: 0,
    deleted_rate_limit_events_count: 0,
    deleted_audit_events_count: 0,
    deleted_orphan_uploads_count: 0,
    freed_bytes: 0,
  };

  const details: Record<string, unknown> = {
    started_at: runAt.toISOString(),
  };

  try {
    // 1) Exports expirados (política: data_exports; default 7 dias)
    const exportRetentionDays = await getGlobalRetentionDays("data_exports", 7);
    const exportCutoff = new Date();
    exportCutoff.setUTCDate(exportCutoff.getUTCDate() - exportRetentionDays);

    const { data: expiredExports, error: expErr } = await admin
      .from("data_export_requests")
      .select("id, user_id, file_path, file_size_bytes")
      .lt("completed_at", exportCutoff.toISOString())
      .eq("status", "completed")
      .not("file_path", "is", null);
    if (expErr) throw expErr;

    const exportRows = (expiredExports ?? []) as any[];
    const exportPaths = exportRows.map((e) => String(e.file_path)).filter(Boolean);
    const exportIds = exportRows.map((e) => String(e.id));

    if (exportPaths.length) {
      counters.deleted_exports_count = await removeInBatches(admin, "exports", exportPaths);
      counters.freed_bytes += exportRows.reduce((sum, r) => sum + Number(r.file_size_bytes ?? 0), 0);

      const { error: updExpErr } = await admin
        .from("data_export_requests")
        .update({ status: "expired", file_path: null, download_url: null })
        .in("id", exportIds);
      if (updExpErr) throw updExpErr;

      // Notificação in-app quando expirado
      const notifications = exportRows.map((r) => ({
        user_id: r.user_id,
        type: "system_announcement",
        priority: "low",
        title: "Exportação expirada",
        message: `Sua exportação LGPD expirou e foi removida automaticamente após ${exportRetentionDays} dias.`,
        action_url: "/dashboard/privacidade",
        action_label: "Central de Privacidade",
        metadata: { export_request_id: r.id, category: "data_export" },
        read: false,
        archived: false,
      }));

      // Inserir em lote (best-effort)
      const { error: notifErr } = await admin.from("notifications").insert(notifications);
      if (notifErr) {
        details.notifications_error = (notifErr as any)?.message ?? String(notifErr);
      }
    }

    details.expired_exports = { candidates: exportRows.length, deleted: counters.deleted_exports_count };

    // 2) DB cleanup guiado por políticas (webhook_logs / rate_limit_events / audit_events / analytics_events)
    const { data: policyResults, error: polErr } = await admin.rpc("cleanup_expired_data");
    if (polErr) throw polErr;
    details.policy_cleanup = policyResults ?? [];

    // Counters aproximados a partir do retorno do RPC
    const rows = (policyResults ?? []) as any[];
    counters.deleted_webhook_logs_count = rows
      .filter((r) => r.entity_type === "webhook_logs")
      .reduce((sum, r) => sum + Number(r.deleted_count ?? 0), 0);
    counters.deleted_rate_limit_events_count = rows
      .filter((r) => r.entity_type === "rate_limit_events")
      .reduce((sum, r) => sum + Number(r.deleted_count ?? 0), 0);
    counters.deleted_audit_events_count = rows
      .filter((r) => r.entity_type === "audit_events")
      .reduce((sum, r) => sum + Number(r.deleted_count ?? 0), 0);

    // 5) Uploads órfãos (media-library)
    const { data: mediaRows, error: mediaErr } = await admin
      .from("media_library")
      .select("storage_path");
    if (mediaErr) throw mediaErr;
    const referenced = new Set((mediaRows ?? []).map((r: any) => String(r.storage_path)).filter(Boolean));

    const allPaths = await listAllStoragePaths(admin, "media-library");
    const orphanPaths = allPaths.filter((p) => !referenced.has(p));
    details.orphan_uploads = { total_listed: allPaths.length, orphan_candidates: orphanPaths.length };

    if (orphanPaths.length) {
      counters.deleted_orphan_uploads_count = await removeInBatches(admin, "media-library", orphanPaths);
    }

    const finishedAt = new Date();
    await admin
      .from("cleanup_metrics")
      .update({
        status: "completed",
        deleted_exports_count: counters.deleted_exports_count,
        deleted_webhook_logs_count: counters.deleted_webhook_logs_count,
        deleted_rate_limit_events_count: counters.deleted_rate_limit_events_count,
        deleted_audit_events_count: counters.deleted_audit_events_count,
        deleted_orphan_uploads_count: counters.deleted_orphan_uploads_count,
        freed_bytes: counters.freed_bytes,
        details: {
          ...details,
          finished_at: finishedAt.toISOString(),
        },
      })
      .eq("id", metricId);

    return { ok: true, metricId, ...counters, details };
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    await admin
      .from("cleanup_metrics")
      .update({
        status: "failed",
        error_message: msg,
        deleted_exports_count: counters.deleted_exports_count,
        deleted_webhook_logs_count: counters.deleted_webhook_logs_count,
        deleted_rate_limit_events_count: counters.deleted_rate_limit_events_count,
        deleted_audit_events_count: counters.deleted_audit_events_count,
        deleted_orphan_uploads_count: counters.deleted_orphan_uploads_count,
        freed_bytes: counters.freed_bytes,
        details: { ...details, error: msg },
      })
      .eq("id", metricId);

    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const result = await runCleanup();
    return json(result, 200);
  } catch (e) {
    console.error("[cleanup-expired-data] error:", e);
    return json({ ok: false, error: (e as Error)?.message ?? String(e) }, 500);
  }
});
