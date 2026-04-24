chrome.runtime.onInstalled.addListener(() => {});

const DEFAULT_API_BASE = "http://localhost:3001";
const RAW_API_ALLOWLIST = (import.meta.env.VITE_API_ALLOWLIST as string | undefined) ?? DEFAULT_API_BASE;

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  const base = typeof apiBase === "string" && apiBase.length > 0 ? normalizeApiBase(apiBase) : DEFAULT_API_BASE;
  return isAllowedApiBase(base) ? base : DEFAULT_API_BASE;
}

function normalizeApiBase(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return DEFAULT_API_BASE;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("API base inválida. Ex: http://localhost:3001");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("API base deve ser http ou https.");
  }
  // Remove trailing slash for consistent URL building.
  return parsed.toString().replace(/\/$/, "");
}

function allowedApiBases() {
  return RAW_API_ALLOWLIST.split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeApiBase(item));
}

function isAllowedApiBase(base: string) {
  return allowedApiBases().includes(normalizeApiBase(base));
}

async function getAuthHeader() {
  const { accessToken } = await chrome.storage.local.get("accessToken");
  if (typeof accessToken === "string" && accessToken.length > 0) {
    return { Authorization: `Bearer ${accessToken}` };
  }
  return {};
}

async function parseApiResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    if (response.status === 401) {
      // Sessao invalida: limpa token local para forcar reauth no popup.
      await chrome.storage.local.remove("accessToken");
    }

    const err = new Error(payload?.error ?? `API error ${response.status}`);
    (err as any).status = response.status;
    (err as any).payload = payload;
    throw err;
  }
  return payload;
}

async function postAnalyze(url: string) {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ url })
  });
  return parseApiResponse(response);
}

async function getHistory(limit = 10) {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/history?limit=${limit}`, { headers: { ...auth } });
  return parseApiResponse(response);
}

async function getAlerts(limit = 10, onlyUnacked = true) {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/alerts?limit=${limit}&onlyUnacked=${onlyUnacked}`, {
    headers: { ...auth }
  });
  return parseApiResponse(response);
}

async function getMe() {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/me`, { headers: { ...auth } });
  return parseApiResponse(response);
}

async function addWatch(url: string) {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ url })
  });
  return parseApiResponse(response);
}

async function getWatchlist() {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/watchlist`, { headers: { ...auth } });
  return parseApiResponse(response);
}

async function removeWatch(id: number) {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/watchlist/${id}`, { method: "DELETE", headers: { ...auth } });
  return parseApiResponse(response);
}

async function clearHistory() {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/history`, { method: "DELETE", headers: { ...auth } });
  return parseApiResponse(response);
}

async function clearWatchlist() {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/watchlist`, { method: "DELETE", headers: { ...auth } });
  return parseApiResponse(response);
}

async function clearAlerts() {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/alerts`, { method: "DELETE", headers: { ...auth } });
  return parseApiResponse(response);
}

async function resetTestAccount() {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/reset-test-account`, { method: "POST", headers: { ...auth } });
  return parseApiResponse(response);
}

async function ackAlert(id: number) {
  const base = await getApiBase();
  const auth = await getAuthHeader();
  const response = await fetch(`${base}/api/alerts/${id}/ack`, {
    method: "POST",
    headers: { ...auth }
  });
  return parseApiResponse(response);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SET_API_BASE") {
    try {
      const base = normalizeApiBase(message.apiBase);
      if (!isAllowedApiBase(base)) {
        return sendResponse({
          ok: false,
          error: `API base não permitida. Use uma das permitidas em VITE_API_ALLOWLIST: ${allowedApiBases().join(", ")}`
        });
      }

      chrome.storage.local
        .set({ apiBase: base })
        .then(() => sendResponse({ ok: true, apiBase: base }))
        .catch((err) => sendResponse({ ok: false, error: err?.message ?? "Failed to save apiBase" }));
    } catch (err) {
      sendResponse({ ok: false, error: err instanceof Error ? err.message : "Falha ao configurar API base." });
    }
  }
  if (message?.type === "SET_ACCESS_TOKEN") {
    const token = typeof message.accessToken === "string" ? message.accessToken : "";
    chrome.storage.local
      .set({ accessToken: token })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err?.message ?? "Failed to set token" }));
  }
  if (message?.type === "CLEAR_ACCESS_TOKEN") {
    chrome.storage.local
      .remove("accessToken")
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err?.message ?? "Failed to clear token" }));
  }
  if (message?.type === "ANALYZE_PRODUCT") {
    postAnalyze(message.url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Analyze failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "GET_ANALYSIS_HISTORY") {
    getHistory(message.limit)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "History failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "GET_ALERTS") {
    getAlerts(message.limit, message.onlyUnacked)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Alerts failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "GET_ME") {
    getMe()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Me failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "ADD_WATCH_URL") {
    addWatch(message.url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Watch failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "CLEAR_HISTORY") {
    clearHistory()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Clear history failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "CLEAR_WATCHLIST") {
    clearWatchlist()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Clear watchlist failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "CLEAR_ALERTS") {
    clearAlerts()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Clear alerts failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "GET_WATCHLIST") {
    getWatchlist()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Watchlist failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "REMOVE_WATCH") {
    removeWatch(Number(message.id))
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Remove watch failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "RESET_TEST_ACCOUNT") {
    resetTestAccount()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Reset test account failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  if (message?.type === "ACK_ALERT") {
    ackAlert(Number(message.id))
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message ?? "Ack failed",
          status: (error as any)?.status,
          details: (error as any)?.payload?.details
        })
      );
  }
  return true;
});


