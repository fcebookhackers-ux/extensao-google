// Edge Function: webhook-worker
// - Cron: process pending webhook_jobs in batches
// - API actions (JWT required): list, metrics, retry_now (immediate), purge_dead

import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate",
};

const BATCH_SIZE = 10;
const MAX_CONCURRENCY = 5;
const DEFAULT_TIMEOUT_MS = 30_000;

type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead";

type JobRow = {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type WebhookRow = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  url: string;
  headers: Record<string, string> | null;
  is_active: boolean | null;
  timeout_seconds: number | null;
};

type SecretsForDelivery = { current?: string | null; previous?: string | null };

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...headers,
    },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calculateBackoffMs(retryCount: number) {
  const baseDelay = 1000; // 1s
  const maxDelay = 60 * 60 * 1000; // 1h
  const exp = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  const jitter = exp * 0.3 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exp + jitter));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const start = performance.now();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      body: text,
      durationMs: Math.round(performance.now() - start),
    };
  } finally {
    clearTimeout(id);
  }
}

async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = [];
  let i = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        const value = await fn(items[idx]);
        results[idx] = { status: "fulfilled", value };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

function getEnv(name: string) {
  return Deno.env.get(name) ?? "";
}

function getSupabaseClients(authHeader?: string) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Server misconfigured: missing SUPABASE_URL/SUPABASE_ANON_KEY/SERVICE_ROLE_KEY");
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, authHeader
    ? { global: { headers: { Authorization: authHeader } } }
    : undefined);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  return { supabaseUrl, supabaseUser, supabaseAdmin };
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return { authHeader: null, userId: null };

  const { supabaseUser } = getSupabaseClients(authHeader);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseUser.auth.getClaims(token);
  const userId = data?.claims?.sub ?? null;
  if (error || !userId) return { authHeader: null, userId: null };
  return { authHeader, userId };
}

async function loadWebhook(supabaseAdmin: any, webhookId: string): Promise<WebhookRow | null> {
  const { data, error } = await supabaseAdmin
    .from("webhooks")
    .select("id,user_id,workspace_id,name,url,headers,is_active,timeout_seconds")
    .eq("id", webhookId)
    .single();
  if (error || !data) return null;
  return {
    ...data,
    headers: (data.headers ?? null) as Record<string, string> | null,
  } as WebhookRow;
}

async function attachWebhookSecrets(supabaseAdmin: any, webhookId: string, headers: Record<string, string>) {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_webhook_secrets_for_delivery", { p_webhook_id: webhookId });
    if (error) return;
    const secrets = (data ?? {}) as SecretsForDelivery;
    if (secrets.current) headers["X-Webhook-Secret"] = String(secrets.current);
    if (secrets.previous) headers["X-Webhook-Secret-Previous"] = String(secrets.previous);
  } catch (e) {
    console.log("webhook-worker: failed to attach secrets", { error: String(e) });
  }
}

async function markJobCompleted(supabaseAdmin: any, jobId: string) {
  await supabaseAdmin
    .from("webhook_jobs")
    .update({ status: "completed", completed_at: new Date().toISOString(), last_error: null })
    .eq("id", jobId);
}

async function markJobFailed(supabaseAdmin: any, jobId: string, fields: Partial<JobRow>) {
  await supabaseAdmin.from("webhook_jobs").update(fields).eq("id", jobId);
}

async function logDelivery(supabaseAdmin: any, job: JobRow, webhook: WebhookRow, result: {
  ok: boolean;
  status: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number;
}) {
  try {
    await supabaseAdmin.from("webhook_logs").insert({
      webhook_id: job.webhook_id,
      event_type: job.event_type,
      payload: job.payload,
      response_status: result.status,
      response_body: result.responseBody,
      error_message: result.errorMessage,
      success: result.ok,
      duration_ms: result.durationMs,
      attempt_number: job.retry_count + 1,
      executed_at: new Date().toISOString(),
      request_headers: null,
    });
  } catch (e) {
    console.log("webhook-worker: failed to insert webhook_logs", { error: String(e), webhook_id: webhook.id });
  }
}

async function notifyPermanentFailure(supabaseAdmin: any, webhook: WebhookRow, job: JobRow) {
  try {
    await supabaseAdmin.rpc("create_notification", {
      p_user_id: webhook.user_id,
      p_type: "webhook_failure",
      p_title: "Falha permanente em webhook",
      p_message: `Webhook "${webhook.name}" falhou após ${job.max_retries} tentativas.`,
      p_priority: "high",
      p_action_url: "/dashboard/analytics",
      p_action_label: "Ver analytics",
      p_metadata: {
        webhook_id: webhook.id,
        workspace_id: webhook.workspace_id,
        job_id: job.id,
        last_error: job.last_error,
      },
      p_expires_in_hours: 24 * 14,
    });
  } catch (e) {
    console.log("webhook-worker: failed to notify", { error: String(e) });
  }
}

async function executeJob(supabaseAdmin: any, job: JobRow) {
  const startTime = performance.now();
  const webhook = await loadWebhook(supabaseAdmin, job.webhook_id);
  if (!webhook) {
    await markJobFailed(supabaseAdmin, job.id, {
      status: "dead",
      last_error: "Webhook não encontrado",
      completed_at: new Date().toISOString(),
    } as any);
    return;
  }

  if (!webhook.is_active) {
    await markJobFailed(supabaseAdmin, job.id, {
      status: "failed",
      last_error: "Webhook inativo",
      completed_at: new Date().toISOString(),
    } as any);
    return;
  }

  const timeoutMs = clamp((webhook.timeout_seconds ?? 10) * 1000, 1000, DEFAULT_TIMEOUT_MS);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ZapFllow-Webhook/1.0",
    "X-Webhook-Id": job.webhook_id,
    "X-Webhook-Timestamp": String(Date.now()),
    ...(webhook.headers ?? {}),
  };

  await attachWebhookSecrets(supabaseAdmin, job.webhook_id, headers);

  // Optional signature for receivers that validate HMAC
  if (headers["X-Webhook-Secret"]) {
    try {
      const sig = await hmacSha256Hex(String(headers["X-Webhook-Secret"]), JSON.stringify(job.payload));
      headers["X-Webhook-Signature"] = sig;
    } catch (e) {
      console.log("webhook-worker: failed to sign payload", { error: String(e) });
    }
  }

  let ok = false;
  let status: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let durationMs = 0;

  try {
    const res = await fetchWithTimeout(
      webhook.url,
      {
        method: "POST",
        headers,
        body: JSON.stringify(job.payload),
      },
      timeoutMs,
    );
    ok = res.ok;
    status = res.status;
    responseBody = res.body;
    durationMs = res.durationMs;
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.body}`);
    }
  } catch (e) {
    errorMessage = String(e);
    durationMs = Math.round(performance.now() - startTime);
  }

  await logDelivery(supabaseAdmin, job, webhook, { ok, status, responseBody, errorMessage, durationMs });

  if (ok) {
    await markJobCompleted(supabaseAdmin, job.id);
    return;
  }

  const newRetryCount = job.retry_count + 1;
  const lastError = errorMessage ?? "Unknown error";
  if (newRetryCount >= job.max_retries) {
    await markJobFailed(supabaseAdmin, job.id, {
      status: "dead",
      retry_count: newRetryCount,
      last_error: lastError,
      completed_at: new Date().toISOString(),
      next_retry_at: null,
    } as any);
    await notifyPermanentFailure(supabaseAdmin, webhook, {
      ...job,
      retry_count: newRetryCount,
      last_error: lastError,
    });
  } else {
    const backoffMs = calculateBackoffMs(newRetryCount);
    const nextRetry = new Date(Date.now() + backoffMs).toISOString();
    await markJobFailed(supabaseAdmin, job.id, {
      status: "pending",
      retry_count: newRetryCount,
      next_retry_at: nextRetry,
      last_error: lastError,
    } as any);
  }
}

async function processBatch(supabaseAdmin: any, limit: number) {
  const { data, error } = await supabaseAdmin.rpc("claim_webhook_jobs", { p_limit: limit });
  if (error) {
    console.log("webhook-worker: claim error", { error });
    return { claimed: 0 };
  }
  const jobs = (data ?? []) as JobRow[];
  if (jobs.length === 0) return { claimed: 0 };

  await mapWithConcurrency(jobs, MAX_CONCURRENCY, async (job) => {
    await executeJob(supabaseAdmin, job);
    return true;
  });

  return { claimed: jobs.length };
}

async function handleApi(req: Request) {
  const { authHeader, userId } = await requireUser(req);
  const body = (await req.json().catch(() => null)) as any;
  const action = String(body?.action ?? "");

  const workerSecret = req.headers.get("X-Worker-Secret") || "";
  const expectedWorkerSecret = getEnv("WEBHOOK_WORKER_SECRET");
  const isCronCall = expectedWorkerSecret && workerSecret && workerSecret === expectedWorkerSecret;

  // Cron-style call (no JWT): process a batch.
  if (action === "process" && isCronCall) {
    const { supabaseAdmin } = getSupabaseClients();
    const limit = clamp(Number(body?.limit ?? BATCH_SIZE), 1, 100);
    const res = await processBatch(supabaseAdmin, limit);
    return json({ ok: true, ...res });
  }

  if (!authHeader || !userId) return json({ error: "Unauthorized" }, 401);
  const { supabaseUser, supabaseAdmin } = getSupabaseClients(authHeader);

  if (action === "metrics") {
    const webhookId = body?.webhook_id ? String(body.webhook_id) : null;
    const status = body?.status ? String(body.status) : null;

    const since60m = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const base = supabaseUser.from("webhook_jobs").select("id", { count: "exact", head: true });
    const basePending = supabaseUser.from("webhook_jobs").select("id", { count: "exact", head: true }).eq("status", "pending");
    const baseDead = supabaseUser.from("webhook_jobs").select("id", { count: "exact", head: true }).eq("status", "dead");
    const baseCompleted = supabaseUser.from("webhook_jobs").select("id", { count: "exact", head: true }).eq("status", "completed");
    const baseFailed = supabaseUser.from("webhook_jobs").select("id", { count: "exact", head: true }).eq("status", "failed");

    const filter = (q: any) => {
      if (webhookId) q = q.eq("webhook_id", webhookId);
      if (status) q = q.eq("status", status);
      return q;
    };

    const processed60mBase = supabaseUser
      .from("webhook_jobs")
      .select("id", { count: "exact", head: true })
      .not("completed_at", "is", null)
      .gte("completed_at", since60m);

    const completed60mBase = supabaseUser
      .from("webhook_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte("completed_at", since60m);

    const failed60mBase = supabaseUser
      .from("webhook_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "dead"])
      .not("completed_at", "is", null)
      .gte("completed_at", since60m);

    const [all, pending, completed, failed, dead, processed60m, completed60m, failed60m] = await Promise.all([
      filter(base),
      filter(basePending),
      filter(baseCompleted),
      filter(baseFailed),
      filter(baseDead),
      filter(processed60mBase),
      filter(completed60mBase),
      filter(failed60mBase),
    ]);

    // Avg latency + success rate per webhook (last 60m) from webhook_logs (service role)
    let avgLatencyMs60m = 0;
    let successRate60m = 0;
    let perWebhook: Array<{ webhook_id: string; deliveries: number; success_rate: number; avg_latency_ms: number }> = [];
    try {
      let q = supabaseAdmin
        .from("webhook_logs")
        .select("webhook_id,success,duration_ms,executed_at")
        .gte("executed_at", since60m)
        .order("executed_at", { ascending: false })
        .limit(1000);
      if (webhookId) q = q.eq("webhook_id", webhookId);
      const { data } = await q;
      const rows = (data ?? []) as Array<{ webhook_id: string; success: boolean | null; duration_ms: number | null }>;
      const okRows = rows.filter((r) => typeof r.duration_ms === "number");
      if (okRows.length) {
        avgLatencyMs60m = Math.round(okRows.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / okRows.length);
      }
      const succ = rows.filter((r) => r.success === true).length;
      successRate60m = rows.length ? (succ / rows.length) * 100 : 0;

      const by: Record<string, { total: number; succ: number; latencySum: number; latencyCount: number }> = {};
      for (const r of rows) {
        const key = r.webhook_id;
        by[key] ??= { total: 0, succ: 0, latencySum: 0, latencyCount: 0 };
        by[key].total += 1;
        if (r.success === true) by[key].succ += 1;
        if (typeof r.duration_ms === "number") {
          by[key].latencySum += r.duration_ms;
          by[key].latencyCount += 1;
        }
      }
      perWebhook = Object.entries(by)
        .map(([id, v]) => ({
          webhook_id: id,
          deliveries: v.total,
          success_rate: v.total ? (v.succ / v.total) * 100 : 0,
          avg_latency_ms: v.latencyCount ? Math.round(v.latencySum / v.latencyCount) : 0,
        }))
        .sort((a, b) => b.deliveries - a.deliveries)
        .slice(0, 10);
    } catch (e) {
      console.log("webhook-worker: metrics logs aggregation failed", { error: String(e) });
    }

    return json({
      total: all.count ?? 0,
      pending: pending.count ?? 0,
      completed: completed.count ?? 0,
      failed: failed.count ?? 0,
      dead: dead.count ?? 0,
      processed_last_60m: processed60m.count ?? 0,
      jobs_per_minute_60m: Number(((processed60m.count ?? 0) / 60).toFixed(2)),
      success_rate_60m: Number(successRate60m.toFixed(1)),
      avg_latency_ms_60m: avgLatencyMs60m,
      per_webhook_60m: perWebhook,
    });
  }

  if (action === "list") {
    const webhookId = body?.webhook_id ? String(body.webhook_id) : null;
    const status = body?.status ? String(body.status) : null;
    const limit = clamp(Number(body?.limit ?? 50), 1, 200);

    let q = supabaseUser
      .from("webhook_jobs")
      .select(
        "id,webhook_id,event_type,status,retry_count,max_retries,next_retry_at,last_error,created_at,started_at,completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (webhookId) q = q.eq("webhook_id", webhookId);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return json({ error: error.message }, 400);
    return json({ items: data ?? [] });
  }

  if (action === "retry_now") {
    const jobId = String(body?.job_id ?? "");
    if (!jobId) return json({ error: "Missing job_id" }, 400);

    // Ensure user can see job via RLS
    const { data: job, error: jobErr } = await supabaseUser
      .from("webhook_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (jobErr || !job) return json({ error: "Not found" }, 404);

    // Execute immediately using admin (bypass RLS), but only after access check above.
    await supabaseAdmin.from("webhook_jobs").update({ status: "processing", started_at: new Date().toISOString() }).eq("id", jobId);
    await executeJob(supabaseAdmin, job as JobRow);
    return json({ ok: true });
  }

  if (action === "purge_dead") {
    const olderThanDays = clamp(Number(body?.older_than_days ?? 30), 1, 365);
    const { data, error } = await supabaseAdmin.rpc("purge_dead_webhook_jobs", { p_older_than_days: olderThanDays });
    if (error) return json({ error: error.message }, 400);
    return json({ deleted: Number(data ?? 0) });
  }

  return json({ error: "Unknown action" }, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    return await handleApi(req);
  } catch (e) {
    console.log("webhook-worker: unexpected error", { error: String(e) });
    return json({ error: "Unexpected error" }, 500);
  }
});
