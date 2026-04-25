import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { analyzeMarketplaceUrl, closeScraper } from "./scraper.js";
import { createAnalysisJobs } from "./jobs.js";
import { startAutoRefresh } from "./scheduler.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const defaultHistoryLimit = 10;
const defaultAlertLimit = 10;
const alertDropThreshold = Math.max(0.001, Number(process.env.ALERT_DROP_THRESHOLD ?? 0.03));
const authServiceBaseUrl = (process.env.AUTH_SERVICE_URL ?? "https://auth.zapfllow.com.br").replace(/\/$/, "");
const publicApiBaseUrl = (process.env.PUBLIC_API_URL ?? "https://api.zapfllow.com.br").replace(/\/$/, "");

app.use(cors());
app.use(express.json({ limit: "256kb" }));

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY ?? "";

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

const supabaseAuth =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

function getEvolutionConfig() {
  const url = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
  const key = process.env.EVOLUTION_API_KEY ?? "";
  if (!url || !key) return null;
  return { url, key };
}

function evolutionHeaders(extra = {}) {
  const cfg = getEvolutionConfig();
  if (!cfg) throw new Error("Evolution API is not configured");
  return {
    apikey: cfg.key,
    ...extra,
  };
}

function normalizeToJid(to) {
  const cleaned = String(to ?? "").trim();
  if (cleaned.includes("@")) return cleaned;
  const digits = cleaned.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

function normalizePhone(value) {
  return String(value ?? "").replace("@s.whatsapp.net", "").replace(/\D/g, "");
}

function extractMessageContent(message) {
  if (!message || typeof message !== "object") return "";
  return (
    message?.conversation ??
    message?.extendedTextMessage?.text ??
    message?.imageMessage?.caption ??
    message?.videoMessage?.caption ??
    message?.documentMessage?.caption ??
    ""
  );
}

async function requireUser(req, res) {
  const authHeader = req.headers.authorization ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) {
    res.status(401).json({ ok: false, error: "Unauthorized", details: "Missing Authorization: Bearer <token>" });
    return null;
  }

  if (supabaseAuth) {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (!error && data?.user?.id) {
      return { userId: data.user.id, email: data.user.email ?? null };
    }
  }

  // Fallback para Better Auth (VPS auth-service).
  try {
    const response = await fetch(`${authServiceBaseUrl}/api/auth/get-session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const payload = await response.json().catch(() => null);
      const user = payload?.session?.user ?? payload?.user ?? payload?.data?.user ?? null;
      if (user?.id) {
        return { userId: user.id, email: user.email ?? null };
      }
    }
  } catch (error) {
    console.error("Auth service verification failed:", error);
  }

  res.status(401).json({ ok: false, error: "Unauthorized", details: "Invalid auth token" });
  return null;
}

async function consumeQuota(userId) {
  const { data, error } = await supabaseAdmin.rpc("consume_analysis_quota", { p_user_id: userId });
  if (error) throw new Error(`Quota RPC failed: ${error.message}`);
  return data;
}

async function requireWhatsappManagePermission(userId, workspaceId) {
  const { data, error } = await supabaseAdmin.rpc("workspace_has_permission", {
    p_workspace_id: workspaceId,
    p_permission: "whatsapp.manage",
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Permission check failed: ${error.message}`);
  }

  if (!Boolean(data)) {
    const forbidden = new Error("Forbidden: missing whatsapp.manage permission");
    forbidden.code = "FORBIDDEN";
    throw forbidden;
  }
}

async function saveAnalysis(userId, analysis) {
  const { data, error: insertError } = await supabaseAdmin
    .from("market_competitor_analyses")
    .insert({
      user_id: userId,
      source_url: analysis.sourceUrl,
      marketplace: analysis.marketplace,
      suggested_price: analysis.suggestedPrice,
      items: analysis.items,
      trend: analysis.trend
    })
    .select("id, source_url, marketplace, suggested_price")
    .single();
  if (insertError) {
    throw new Error(`Failed to save analysis: ${insertError.message}`);
  }
  return data;
}

async function runAndPersistAnalysis(userId, url, reason = "manual") {
  if (reason === "manual") {
    const q = await consumeQuota(userId);
    if (!q?.allowed) {
      const err = new Error("Daily quota exceeded");
      err.code = "QUOTA";
      err.details = q;
      throw err;
    }
  }

  const analysis = await analyzeMarketplaceUrl(url);
  const inserted = await saveAnalysis(userId, analysis);
  await supabaseAdmin
    .from("market_watchlist")
    .upsert(
      {
        user_id: userId,
        source_url: analysis.sourceUrl,
        marketplace: analysis.marketplace,
        is_active: true,
        last_suggested_price: analysis.suggestedPrice
      },
      { onConflict: "user_id,source_url" }
    );

  const { data: prev, error: prevError } = await supabaseAdmin
    .from("market_competitor_analyses")
    .select("id, suggested_price")
    .eq("user_id", userId)
    .eq("source_url", analysis.sourceUrl)
    .lt("id", inserted.id)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prevError && prev && Number(prev.suggested_price) > 0) {
    const previous = Number(prev.suggested_price);
    const current = Number(analysis.suggestedPrice);
    const change = (current - previous) / previous;
    if (change <= -alertDropThreshold) {
      await supabaseAdmin.from("market_price_alerts").insert({
        user_id: userId,
        source_url: analysis.sourceUrl,
        marketplace: analysis.marketplace,
        previous_price: previous,
        current_price: current,
        percent_change: Number(change.toFixed(6)),
        alert_type: "price_drop",
        details: {
          analysis_id: inserted.id,
          threshold: alertDropThreshold
        }
      });
    }
  }

  return analysis;
}

const jobs = createAnalysisJobs(async (url, reason, userId) => runAndPersistAnalysis(userId, url, reason));
const refreshScheduler = startAutoRefresh({
  supabase: supabaseAdmin,
  enqueueRefresh: async (url, reason, userId) => {
    if (jobs.enabled) {
      await jobs.enqueue(url, reason, userId);
      return;
    }
    await runAndPersistAnalysis(userId, url, reason);
  }
});

app.get("/health", (_req, res) => {
  let projectRef = null;
  try {
    projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : null;
  } catch {
    projectRef = null;
  }
  res.json({
    ok: true,
    service: "zapfllow-intel-api",
    supabaseConnected: Boolean(supabaseAdmin),
    supabaseProjectRef: projectRef,
    authEnabled: Boolean(supabaseAuth),
    queueEnabled: jobs.enabled,
    time: Date.now()
  });
});

app.get("/api/me", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;

  const { data: planRow, error: planError } = await supabaseAdmin
    .from("market_user_plans")
    .select("plan, daily_analysis_limit, watchlist_limit")
    .eq("user_id", user.userId)
    .maybeSingle();
  if (planError) {
    return res.status(500).json({ ok: false, error: "Failed to load plan", details: planError.message });
  }

  const { data: usageRow, error: usageError } = await supabaseAdmin
    .from("market_usage_daily")
    .select("analyses_count")
    .eq("user_id", user.userId)
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  if (usageError) {
    return res.status(500).json({ ok: false, error: "Failed to load usage", details: usageError.message });
  }

  return res.json({
    ok: true,
    user: {
      id: user.userId,
      email: user.email
    },
    plan: planRow?.plan ?? "free",
    dailyAnalysisLimit: Number(planRow?.daily_analysis_limit ?? 10),
    watchlistLimit: Number(planRow?.watchlist_limit ?? 30),
    analysesToday: Number(usageRow?.analyses_count ?? 0)
  });
});

app.get("/api/whatsapp/evolution/test", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const cfg = getEvolutionConfig();
  if (!cfg) {
    return res.status(500).json({
      ok: false,
      success: false,
      error: "Evolution API not configured",
      details: "Missing EVOLUTION_API_URL or EVOLUTION_API_KEY",
    });
  }

  try {
    const start = Date.now();
    const response = await fetch(`${cfg.url}/instance/fetchInstances`, {
      method: "GET",
      headers: evolutionHeaders(),
    });
    const durationMs = Date.now() - start;
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        success: false,
        error: "Evolution API request failed",
        message: typeof payload === "string" ? payload : payload?.message ?? `HTTP ${response.status}`,
        details: { status: response.status, body: payload },
      });
    }

    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.instance)
      ? payload.instance
      : Array.isArray(payload?.instances)
      ? payload.instances
      : [];

    return res.json({
      ok: true,
      success: true,
      message: "Conexão com Evolution API funcionando",
      summary: {
        url: cfg.url,
        status: response.status,
        responseTime: `${durationMs}ms`,
        instancesFound: list.length,
      },
      raw: payload,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      success: false,
      error: "Evolution connectivity test failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/whatsapp/instances/create", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;

  const cfg = getEvolutionConfig();
  if (!cfg) {
    return res.status(500).json({ ok: false, error: "Evolution API not configured" });
  }

  const workspaceId = String(req.body?.workspaceId ?? "").trim();
  if (!workspaceId) return res.status(400).json({ ok: false, error: "workspaceId is required" });

  try {
    await requireWhatsappManagePermission(user.userId, workspaceId);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (existingError) return res.status(500).json({ ok: false, error: existingError.message });
    if (existing?.id) return res.json(existing);

    const instanceName = `zapfllow_${workspaceId.slice(0, 8)}_${Date.now()}`;
    const createResponse = await fetch(`${cfg.url}/instance/create`, {
      method: "POST",
      headers: evolutionHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    });

    const createText = await createResponse.text();
    let createPayload = null;
    try {
      createPayload = createText ? JSON.parse(createText) : null;
    } catch {
      createPayload = null;
    }

    if (!createResponse.ok) {
      return res.status(502).json({
        ok: false,
        error: "Failed to create instance in Evolution API",
        details: createPayload?.message ?? createText ?? `HTTP ${createResponse.status}`,
      });
    }

    const evolutionInstanceId = createPayload?.instance?.instanceId ?? createPayload?.instanceId ?? null;
    const returnedInstanceName =
      createPayload?.instance?.instanceName ?? createPayload?.instance?.name ?? createPayload?.instanceName ?? instanceName;

    const webhookUrl = `${publicApiBaseUrl}/api/whatsapp/evolution/webhook`;
    await fetch(`${cfg.url}/webhook/set/${encodeURIComponent(returnedInstanceName)}`, {
      method: "POST",
      headers: evolutionHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: true,
        events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
      }),
    }).catch((err) => {
      console.error("Failed to configure Evolution webhook:", err);
    });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("whatsapp_instances")
      .insert({
        workspace_id: workspaceId,
        instance_name: returnedInstanceName,
        evolution_instance_id: evolutionInstanceId,
        status: "connecting",
        webhook_url: webhookUrl,
        webhook_events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
      })
      .select("*")
      .single();
    if (insertError) return res.status(500).json({ ok: false, error: insertError.message });

    const connectResponse = await fetch(`${cfg.url}/instance/connect/${encodeURIComponent(returnedInstanceName)}`, {
      method: "GET",
      headers: evolutionHeaders(),
    }).catch(() => null);

    if (connectResponse?.ok) {
      const connectPayload = await connectResponse.json().catch(() => null);
      const qrCode = connectPayload?.base64 ?? connectPayload?.qrcode ?? null;
      if (qrCode) {
        await supabaseAdmin.from("whatsapp_instances").update({ qr_code: qrCode, status: "qr_ready" }).eq("id", inserted.id);
        inserted.qr_code = qrCode;
        inserted.status = "qr_ready";
      }
    }

    return res.json(inserted);
  } catch (error) {
    if (error?.code === "FORBIDDEN") return res.status(403).json({ ok: false, error: error.message });
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/api/whatsapp/instances/disconnect", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const cfg = getEvolutionConfig();
  if (!cfg) return res.status(500).json({ ok: false, error: "Evolution API not configured" });

  const instanceId = String(req.body?.instanceId ?? "").trim();
  if (!instanceId) return res.status(400).json({ ok: false, error: "instanceId is required" });

  try {
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("id,workspace_id,instance_name")
      .eq("id", instanceId)
      .maybeSingle();
    if (instanceError) return res.status(500).json({ ok: false, error: instanceError.message });
    if (!instance) return res.status(404).json({ ok: false, error: "Instance not found" });

    await requireWhatsappManagePermission(user.userId, instance.workspace_id);

    await fetch(`${cfg.url}/instance/logout/${encodeURIComponent(instance.instance_name)}`, {
      method: "DELETE",
      headers: evolutionHeaders(),
    }).catch((err) => {
      console.error("Evolution logout failed:", err);
    });
    await fetch(`${cfg.url}/instance/delete/${encodeURIComponent(instance.instance_name)}`, {
      method: "DELETE",
      headers: evolutionHeaders(),
    }).catch((err) => {
      console.error("Evolution delete failed:", err);
    });

    const { error: deleteError } = await supabaseAdmin.from("whatsapp_instances").delete().eq("id", instance.id);
    if (deleteError) return res.status(500).json({ ok: false, error: deleteError.message });
    return res.json({ ok: true, success: true });
  } catch (error) {
    if (error?.code === "FORBIDDEN") return res.status(403).json({ ok: false, error: error.message });
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/api/whatsapp/messages/send", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const cfg = getEvolutionConfig();
  if (!cfg) return res.status(500).json({ ok: false, error: "Evolution API not configured" });

  const whatsappInstanceId = String(req.body?.instanceId ?? req.body?.whatsappInstanceId ?? "").trim();
  const to = String(req.body?.to ?? "").trim();
  const message = String(req.body?.message ?? "").trim();
  const mediaUrl = req.body?.mediaUrl ? String(req.body.mediaUrl) : null;
  const mediaType = req.body?.mediaType ? String(req.body.mediaType) : "image";

  if (!whatsappInstanceId || !to || !message) {
    return res.status(400).json({ ok: false, error: "instanceId/whatsappInstanceId, to and message are required" });
  }

  try {
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("id,workspace_id,instance_name,phone_number,status")
      .eq("id", whatsappInstanceId)
      .maybeSingle();
    if (instanceError) return res.status(500).json({ ok: false, error: instanceError.message });
    if (!instance) return res.status(404).json({ ok: false, error: "Instance not found" });

    await requireWhatsappManagePermission(user.userId, instance.workspace_id);

    const jid = normalizeToJid(to);
    const endpoint = mediaUrl
      ? `${cfg.url}/message/sendMedia/${encodeURIComponent(instance.instance_name)}`
      : `${cfg.url}/message/sendText/${encodeURIComponent(instance.instance_name)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: evolutionHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(
        mediaUrl
          ? { number: jid, mediatype: mediaType, media: mediaUrl, caption: message }
          : { number: jid, text: message },
      ),
    });

    const responseText = await response.text();
    let responsePayload = null;
    try {
      responsePayload = responseText ? JSON.parse(responseText) : null;
    } catch {
      responsePayload = null;
    }

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "Failed to send message with Evolution API",
        details: responsePayload?.message ?? responseText ?? `HTTP ${response.status}`,
      });
    }

    // Persist outgoing message to keep UI in sync.
    const toNumber = normalizePhone(jid);
    const fromNumber = normalizePhone(instance.phone_number);

    let contactId = null;
    const { data: rpcContact } = await supabaseAdmin.rpc("upsert_contact_from_whatsapp", {
      p_workspace_id: instance.workspace_id,
      p_phone: toNumber,
      p_name: null,
    });
    if (rpcContact) contactId = rpcContact;

    const messageId =
      responsePayload?.key?.id ??
      responsePayload?.messageId ??
      responsePayload?.id ??
      `out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await supabaseAdmin.from("whatsapp_messages").upsert(
      {
        whatsapp_instance_id: instance.id,
        workspace_id: instance.workspace_id,
        contact_id: contactId,
        message_id: String(messageId),
        from_number: fromNumber || "unknown",
        to_number: toNumber,
        message_type: mediaUrl ? mediaType : "text",
        content: message,
        media_url: mediaUrl,
        timestamp: new Date().toISOString(),
        is_from_me: true,
        processed: true,
        processed_at: new Date().toISOString(),
        automation_triggered: false,
      },
      { onConflict: "whatsapp_instance_id,message_id", ignoreDuplicates: true },
    );

    if (contactId) {
      await supabaseAdmin.rpc("upsert_whatsapp_conversation", {
        p_whatsapp_instance_id: instance.id,
        p_workspace_id: instance.workspace_id,
        p_contact_id: contactId,
        p_last_message_content: message,
        p_last_message_from_me: true,
      });
    }

    await supabaseAdmin
      .from("whatsapp_instances")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", instance.id);

    return res.json({ ok: true, success: true, data: responsePayload ?? {} });
  } catch (error) {
    if (error?.code === "FORBIDDEN") return res.status(403).json({ ok: false, error: error.message });
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/api/whatsapp/evolution/webhook", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  try {
    const payload = req.body ?? {};
    const event = String(payload?.event ?? payload?.type ?? "").toUpperCase().replace(/\./g, "_");
    const data = payload?.data ?? payload;
    const instanceName = payload?.instance ?? payload?.instanceName ?? data?.instance ?? data?.instanceName;
    if (!instanceName) return res.status(400).json({ ok: false, error: "No instance provided" });

    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("id,workspace_id,instance_name,phone_number")
      .eq("instance_name", instanceName)
      .maybeSingle();
    if (instanceError) return res.status(500).json({ ok: false, error: instanceError.message });
    if (!instance) return res.status(404).json({ ok: false, error: "Instance not found" });

    if (event === "QRCODE_UPDATED") {
      const qrcode = data?.qrcode ?? payload?.qrcode ?? data?.base64 ?? null;
      if (qrcode) {
        await supabaseAdmin
          .from("whatsapp_instances")
          .update({ qr_code: qrcode, status: "qr_ready", last_seen_at: new Date().toISOString() })
          .eq("id", instance.id);
      }
      return res.json({ ok: true });
    }

    if (event === "CONNECTION_UPDATE") {
      const stateRaw = String(data?.state ?? data?.status ?? payload?.status ?? "").toLowerCase();
      const stateMap = {
        open: "connected",
        connected: "connected",
        close: "disconnected",
        disconnected: "disconnected",
        connecting: "connecting",
      };
      const nextStatus = stateMap[stateRaw] ?? "connecting";
      const updatePayload = {
        status: nextStatus,
        qr_code: nextStatus === "connected" ? null : undefined,
        connected_at: nextStatus === "connected" ? new Date().toISOString() : undefined,
        last_seen_at: new Date().toISOString(),
        phone_number: data?.instance?.owner ? normalizePhone(data.instance.owner) : undefined,
        profile_name: data?.instance?.profileName ?? undefined,
      };
      await supabaseAdmin.from("whatsapp_instances").update(updatePayload).eq("id", instance.id);
      return res.json({ ok: true });
    }

    if (event === "MESSAGES_UPSERT") {
      const messages = Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(payload?.messages)
        ? payload.messages
        : Array.isArray(data)
        ? data
        : [];

      for (const msg of messages) {
        const key = msg?.key ?? {};
        const remoteJid = String(key?.remoteJid ?? msg?.key?.remoteJid ?? "");
        if (!remoteJid) continue;
        const fromMe = Boolean(key?.fromMe);
        const number = normalizePhone(remoteJid);
        const content = extractMessageContent(msg?.message ?? {});
        const tsSec = Number(msg?.messageTimestamp ?? Date.now() / 1000);
        const timestamp = Number.isFinite(tsSec) ? new Date(tsSec * 1000).toISOString() : new Date().toISOString();

        const { data: contactId } = await supabaseAdmin.rpc("upsert_contact_from_whatsapp", {
          p_workspace_id: instance.workspace_id,
          p_phone: number,
          p_name: msg?.pushName ?? null,
        });

        const fromNumber = fromMe ? normalizePhone(instance.phone_number) : number;
        const toNumber = fromMe ? number : normalizePhone(instance.phone_number);

        await supabaseAdmin.from("whatsapp_messages").upsert(
          {
            whatsapp_instance_id: instance.id,
            workspace_id: instance.workspace_id,
            contact_id: contactId ?? null,
            message_id: String(key?.id ?? msg?.id ?? `${Date.now()}`),
            from_number: fromNumber || "unknown",
            to_number: toNumber || "unknown",
            message_type: "text",
            content,
            timestamp,
            is_from_me: fromMe,
            processed: false,
          },
          { onConflict: "whatsapp_instance_id,message_id", ignoreDuplicates: true },
        );

        if (contactId) {
          await supabaseAdmin.rpc("upsert_whatsapp_conversation", {
            p_whatsapp_instance_id: instance.id,
            p_workspace_id: instance.workspace_id,
            p_contact_id: contactId,
            p_last_message_content: content,
            p_last_message_from_me: fromMe,
          });
        }
      }

      await supabaseAdmin
        .from("whatsapp_instances")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", instance.id);

      return res.json({ ok: true, processed: messages.length });
    }

    return res.json({ ok: true, ignored: true });
  } catch (error) {
    console.error("Evolution webhook error:", error);
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown webhook error" });
  }
});

app.post("/api/watchlist", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const { url, targetPrice } = req.body ?? {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ ok: false, error: "Missing url" });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid url" });
  }

  const marketplace = parsed.hostname.includes("mercadolivre")
    ? "mercado_livre"
    : parsed.hostname.includes("shopee")
    ? "shopee"
    : "other";

  const { data, error } = await supabaseAdmin
    .from("market_watchlist")
    .upsert(
      {
        user_id: user.userId,
        source_url: parsed.toString(),
        marketplace,
        is_active: true,
        target_price: Number.isFinite(Number(targetPrice)) ? Number(targetPrice) : null
      },
      { onConflict: "user_id,source_url" }
    )
    .select("id, source_url, marketplace, is_active, target_price, last_suggested_price, created_at")
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to save watchlist", details: error.message });
  }

  return res.json({ ok: true, item: data });
});

app.get("/api/watchlist", async (_req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(_req, res);
  if (!user) return;
  const { data, error } = await supabaseAdmin
    .from("market_watchlist")
    .select("id, source_url, marketplace, is_active, target_price, last_suggested_price, created_at")
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to load watchlist", details: error.message });
  }
  return res.json({ ok: true, items: data ?? [] });
});

app.delete("/api/watchlist/:id", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

  const { error } = await supabaseAdmin
    .from("market_watchlist")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.userId);
  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to disable watch", details: error.message });
  }
  return res.json({ ok: true });
});

app.delete("/api/watchlist", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const { error } = await supabaseAdmin
    .from("market_watchlist")
    .update({ is_active: false })
    .eq("user_id", user.userId)
    .eq("is_active", true);
  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to clear watchlist", details: error.message });
  }
  return res.json({ ok: true });
});

app.post("/api/analyze", async (req, res) => {
  const { url, async: runAsync } = req.body ?? {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ ok: false, error: "Missing url" });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({
      ok: false,
      error: "Supabase not configured",
      details: "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in api environment."
    });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid url" });
  }

  try {
    if (jobs.enabled) {
      if (runAsync === true) {
        const queued = await jobs.enqueue(parsedUrl.toString(), "manual", user.userId);
        return res.status(202).json({
          ok: true,
          queued: true,
          jobId: queued.jobId
        });
      }

      const completed = await jobs.enqueueAndWait(parsedUrl.toString(), "manual", user.userId);
      return res.json({
        ok: true,
        jobId: completed.jobId,
        ...completed.data
      });
    }

    const analysis = await runAndPersistAnalysis(user.userId, parsedUrl.toString(), "manual");
    return res.json({
      ok: true,
      ...analysis
    });
  } catch (error) {
    if (error?.code === "QUOTA") {
      return res.status(429).json({
        ok: false,
        error: "Quota exceeded",
        details: error.details
      });
    }
    return res.status(502).json({
      ok: false,
      error: "Analyze failed",
      details: error instanceof Error ? error.message : "Unknown scraping error"
    });
  }
});

app.get("/api/analyze/jobs/:jobId", async (req, res) => {
  if (!jobs.enabled) {
    return res.status(400).json({
      ok: false,
      error: "Queue disabled",
      details: "Configure REDIS_URL to enable job queue."
    });
  }

  try {
    const status = await jobs.getStatus(req.params.jobId);
    return res.json({ ok: true, ...status });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to fetch job status",
      details: error instanceof Error ? error.message : "Unknown job status error"
    });
  }
});

app.get("/api/alerts", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const requestedLimit = Number(req.query.limit);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 100)
      : defaultAlertLimit;
  const onlyUnacked = req.query.onlyUnacked === "true";

  let query = supabaseAdmin
    .from("market_price_alerts")
    .select("id, source_url, marketplace, previous_price, current_price, percent_change, alert_type, created_at, acknowledged_at, details")
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (onlyUnacked) query = query.is("acknowledged_at", null);

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to fetch alerts", details: error.message });
  }
  return res.json({ ok: true, items: data ?? [] });
});

app.post("/api/alerts/:id/ack", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
  const { error } = await supabaseAdmin
    .from("market_price_alerts")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.userId);
  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to acknowledge alert", details: error.message });
  }
  return res.json({ ok: true });
});

app.delete("/api/alerts", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase not configured" });
  const user = await requireUser(req, res);
  if (!user) return;
  const { error } = await supabaseAdmin
    .from("market_price_alerts")
    .delete()
    .eq("user_id", user.userId);
  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to clear alerts", details: error.message });
  }
  return res.json({ ok: true });
});

app.get("/api/history", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({
      ok: false,
      error: "Supabase not configured",
      details: "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in api environment."
    });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const requestedLimit = Number(req.query.limit);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 50)
      : defaultHistoryLimit;

  const { data, error } = await supabaseAdmin
    .from("market_competitor_analyses")
    .select("id, source_url, marketplace, suggested_price, created_at")
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return res
      .status(500)
      .json({ ok: false, error: "Failed to fetch history", details: error.message });
  }

  return res.json({ ok: true, items: data ?? [] });
});

app.delete("/api/history", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({
      ok: false,
      error: "Supabase not configured",
      details: "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in api environment."
    });
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const { error } = await supabaseAdmin
    .from("market_competitor_analyses")
    .delete()
    .eq("user_id", user.userId);
  if (error) {
    return res.status(500).json({ ok: false, error: "Failed to clear history", details: error.message });
  }
  return res.json({ ok: true });
});

app.post("/api/reset-test-account", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({
      ok: false,
      error: "Supabase not configured",
      details: "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in api environment."
    });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const userId = user.userId;

  const [historyResult, alertsResult, watchResult, usageResult] = await Promise.all([
    supabaseAdmin.from("market_competitor_analyses").delete().eq("user_id", userId),
    supabaseAdmin.from("market_price_alerts").delete().eq("user_id", userId),
    supabaseAdmin.from("market_watchlist").delete().eq("user_id", userId),
    supabaseAdmin.from("market_usage_daily").delete().eq("user_id", userId)
  ]);

  const firstError =
    historyResult.error ?? alertsResult.error ?? watchResult.error ?? usageResult.error;

  if (firstError) {
    return res.status(500).json({
      ok: false,
      error: "Failed to reset test account",
      details: firstError.message
    });
  }

  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  refreshScheduler.stop();
  await jobs.close();
  await closeScraper();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  refreshScheduler.stop();
  await jobs.close();
  await closeScraper();
  process.exit(0);
});
