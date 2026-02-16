chrome.runtime.onInstalled.addListener(() => {
  console.log("Zapfllow Intel installed");
});

const DEFAULT_API_BASE = "http://localhost:3001";

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  return typeof apiBase === "string" && apiBase.length > 0 ? apiBase : DEFAULT_API_BASE;
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

function hostPermissionForBase(base: string) {
  const parsed = new URL(base);
  return `${parsed.protocol}//${parsed.host}/*`;
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
    const details =
      payload?.details && typeof payload.details === "object"
        ? JSON.stringify(payload.details)
        : payload?.details;
    const err = new Error(details ?? payload?.error ?? `API error ${response.status}`);
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
      const hostPermission = hostPermissionForBase(base);

      // If already granted, skip prompt.
      chrome.permissions.contains({ origins: [hostPermission] }, (has) => {
        const finish = (ok: boolean, error?: string) => {
          if (!ok) return sendResponse({ ok: false, error: error ?? "Permissão negada para acessar a API." });
          chrome.storage.local
            .set({ apiBase: base })
            .then(() => sendResponse({ ok: true, apiBase: base }))
            .catch((err) => sendResponse({ ok: false, error: err?.message ?? "Failed to save apiBase" }));
        };

        if (has) return finish(true);

        // Request at runtime (manifest must include optional_host_permissions + "permissions" permission).
        chrome.permissions.request({ origins: [hostPermission] }, (granted) => {
          finish(Boolean(granted));
        });
      });
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
          status: (error as any)?.status
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
          status: (error as any)?.status
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
          status: (error as any)?.status
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
          status: (error as any)?.status
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
          status: (error as any)?.status
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
          status: (error as any)?.status
        })
      );
  }
  return true;
});
