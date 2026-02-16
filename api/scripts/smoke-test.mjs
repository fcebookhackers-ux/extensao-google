import { createClient } from "@supabase/supabase-js";

const API_BASE = process.env.API_BASE ?? "http://localhost:3001";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const TARGET_URL = process.env.TARGET_URL ?? "https://www.mercadolivre.com.br/";

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function apiFetch(path, token, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) {
    throw new Error(`${path} failed: ${json?.error ?? response.status} ${json?.details ?? ""}`.trim());
  }
  return json;
}

async function main() {
  requireEnv("SUPABASE_URL", SUPABASE_URL);
  requireEnv("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
  requireEnv("TEST_EMAIL", TEST_EMAIL);
  requireEnv("TEST_PASSWORD", TEST_PASSWORD);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const signIn = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  if (signIn.error || !signIn.data?.session?.access_token) {
    throw new Error(`signIn failed: ${signIn.error?.message ?? "no token"}`);
  }
  const token = signIn.data.session.access_token;

  const health = await fetch(`${API_BASE}/health`).then((r) => r.json());
  console.log("health.ok", health.ok, "queueEnabled", health.queueEnabled);

  await apiFetch("/api/watchlist", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: TARGET_URL })
  });
  console.log("watchlist.add ok");

  const analyze = await apiFetch("/api/analyze", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: TARGET_URL })
  });
  console.log("analyze.items", analyze.items?.length ?? 0, "suggestedPrice", analyze.suggestedPrice);

  const history = await apiFetch("/api/history?limit=3", token);
  console.log("history.count", history.items?.length ?? 0);

  const alerts = await apiFetch("/api/alerts?limit=3&onlyUnacked=true", token);
  console.log("alerts.unacked", alerts.items?.length ?? 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

