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

async function requireUser(req, res) {
  if (!supabaseAuth) {
    res.status(500).json({ ok: false, error: "Server misconfigured", details: "Missing SUPABASE_ANON_KEY" });
    return null;
  }
  const authHeader = req.headers.authorization ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) {
    res.status(401).json({ ok: false, error: "Unauthorized", details: "Missing Authorization: Bearer <token>" });
    return null;
  }
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user?.id) {
    res.status(401).json({ ok: false, error: "Unauthorized", details: error?.message ?? "Invalid token" });
    return null;
  }
  return { userId: data.user.id, email: data.user.email ?? null };
}

async function consumeQuota(userId) {
  const { data, error } = await supabaseAdmin.rpc("consume_analysis_quota", { p_user_id: userId });
  if (error) throw new Error(`Quota RPC failed: ${error.message}`);
  return data;
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
