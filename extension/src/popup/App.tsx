import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type AnalyzeItem = {
  name: string;
  url?: string | null;
  price: number;
  shipping: number;
  sales: number;
  rating: number;
};

type AnalyzeResponse = {
  receivedAt: number;
  sourceUrl: string;
  marketplace: "mercado_livre" | "shopee" | "other";
  items: AnalyzeItem[];
  suggestedPrice: number;
  trend?: number[];
};

type HistoryItem = {
  id: number;
  source_url: string;
  marketplace: "mercado_livre" | "shopee" | "other";
  suggested_price: number;
  created_at: string;
};

type AlertItem = {
  id: number;
  source_url: string;
  marketplace: "mercado_livre" | "shopee" | "other";
  previous_price: number;
  current_price: number;
  percent_change: number;
  created_at: string;
  acknowledged_at: string | null;
};

type WatchItem = {
  id: number;
  source_url: string;
  marketplace: "mercado_livre" | "shopee" | "other";
  is_active: boolean;
  target_price: number | null;
  last_suggested_price: number | null;
  created_at: string;
};

type MeResponse = {
  plan: "free" | "pro" | "business";
  dailyAnalysisLimit: number;
  watchlistLimit: number;
  analysesToday: number;
  user?: { id: string; email: string | null };
};

const trendFallback = [0.2, 0.45, 0.3, 0.6, 0.5, 0.7, 0.62, 0.85];

function normalizeTrend(values: number[]) {
  if (values.length === 0) return trendFallback;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((value) => (value - min) / range);
}

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatShipping(value: number) {
  if (value === 0) return "Grátis";
  return formatPrice(value);
}

function parseDetailsMaybeJson(details: unknown) {
  if (details && typeof details === "object") return details as Record<string, unknown>;
  if (typeof details !== "string") return null;
  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function friendlyErrorMessage(input: { error?: string; status?: number; details?: unknown; apiBase: string }) {
  const { error, status, details, apiBase } = input;
  const detailsObj = parseDetailsMaybeJson(details);
  const detailsText = typeof details === "string" ? details : "";

  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 429) {
    const limit = detailsObj?.limit ?? "?";
    const count = detailsObj?.count ?? "?";
    return `Limite diário atingido: ${count}/${limit}.`;
  }
  if (status === 502 && /capturar produtos concorrentes/i.test(detailsText)) {
    return "Falha no scraping desta página específica. Tente outro produto ou novamente em instantes.";
  }
  if (error === "Failed to fetch" || /Failed to fetch/i.test(detailsText)) {
    return `Sem conexão com API em ${apiBase}.`;
  }
  return detailsText || error || "Erro inesperado.";
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [pageStatus, setPageStatus] = useState<"idle" | "valid" | "invalid" | "unknown">(
    "idle"
  );
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [watchSaving, setWatchSaving] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState("http://localhost:3001");
  const [apiBaseSaving, setApiBaseSaving] = useState(false);
  const [apiBaseInfo, setApiBaseInfo] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);

  const isAuthed = Boolean(authedEmail);

  async function persistSession(session: { access_token: string; refresh_token: string }, email?: string | null) {
    await chrome.storage.local.set({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userEmail: email ?? null
    });
    await chrome.runtime.sendMessage({ type: "SET_ACCESS_TOKEN", accessToken: session.access_token });
    setAuthedEmail(email ?? null);
  }

  async function clearSession() {
    await chrome.storage.local.remove(["accessToken", "refreshToken", "userEmail"]);
    await chrome.runtime.sendMessage({ type: "CLEAR_ACCESS_TOKEN" });
    setAuthedEmail(null);
    setMe(null);
  }

  async function initAuth() {
    setAuthLoading(true);
    try {
      const stored = await chrome.storage.local.get(["accessToken", "refreshToken", "userEmail"]);
      const accessToken = typeof stored.accessToken === "string" ? stored.accessToken : "";
      const refreshToken = typeof stored.refreshToken === "string" ? stored.refreshToken : "";
      const userEmail = typeof stored.userEmail === "string" ? stored.userEmail : null;

      // If we have an access token, assume logged in and let API validate it.
      if (accessToken) {
        setAuthedEmail(userEmail);
        return;
      }

      // Try to refresh if possible.
      if (refreshToken) {
        const { data, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken
        });
        if (!refreshError && data?.session) {
          await persistSession(
            { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
            data.session.user.email ?? userEmail
          );
          return;
        }
      }

      setAuthedEmail(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin() {
    setError(null);
    setAuthInfo(null);
    setAuthLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });
      if (signInError || !data?.session) {
        throw new Error(signInError?.message ?? "Falha no login.");
      }
      await persistSession(
        { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
        data.session.user.email ?? loginEmail.trim()
      );
      setLoginPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no login.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setAuthInfo(null);
    setAuthLoading(true);
    try {
      await clearSession();
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignup() {
    setError(null);
    setAuthInfo(null);
    setAuthLoading(true);
    try {
      const email = loginEmail.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: loginPassword
      });
      if (signUpError) throw new Error(signUpError.message);

      // If email confirmation is enabled, Supabase may not return a session yet.
      if (data?.session) {
        await persistSession(
          { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
          data.user?.email ?? email
        );
        setLoginPassword("");
        setAuthInfo("Conta criada e logada.");
      } else {
        setAuthInfo("Conta criada. Verifique seu email para confirmar e depois faça login.");
        setAuthMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no cadastro.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      if (!isAuthed) throw new Error("Faça login para usar.");
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url;
      if (!url) throw new Error("URL da aba ativa não encontrada.");
      if (!isSupportedUrl(url)) {
        setPageStatus("invalid");
        throw new Error("Esta página não é compatível.");
      }
      setPageStatus("valid");
      const response = await chrome.runtime.sendMessage({ type: "ANALYZE_PRODUCT", url });
      if (!response?.ok) {
        throw {
          message: response?.error ?? "Falha ao analisar.",
          status: response?.status,
          details: response?.details
        };
      }
      setData(response.data);
      setLastUpdated(Date.now());
      await loadHistory();
      await loadAlerts();
      await loadWatchlist();
      await loadMe();
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError(
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      if (!isAuthed) {
        setHistory([]);
        return;
      }
      const response = await chrome.runtime.sendMessage({
        type: "GET_ANALYSIS_HISTORY",
        limit: 5
      });
      if (!response?.ok) {
        throw { message: response?.error ?? "Falha ao buscar histórico.", status: response?.status, details: response?.details };
      }
      setHistory(response?.data?.items ?? []);
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError((prev) =>
        prev ??
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadAlerts() {
    setAlertsLoading(true);
    try {
      if (!isAuthed) {
        setAlerts([]);
        return;
      }
      const response = await chrome.runtime.sendMessage({
        type: "GET_ALERTS",
        limit: 5,
        onlyUnacked: true
      });
      if (!response?.ok) {
        throw { message: response?.error ?? "Falha ao carregar alertas.", status: response?.status, details: response?.details };
      }
      setAlerts(response?.data?.items ?? []);
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError((prev) =>
        prev ??
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    } finally {
      setAlertsLoading(false);
    }
  }

  async function loadWatchlist() {
    setWatchlistLoading(true);
    try {
      if (!isAuthed) {
        setWatchlist([]);
        return;
      }
      const response = await chrome.runtime.sendMessage({ type: "GET_WATCHLIST" });
      if (!response?.ok) {
        throw { message: response?.error ?? "Falha ao carregar monitorados.", status: response?.status, details: response?.details };
      }
      const items = (response?.data?.items ?? []) as WatchItem[];
      setWatchlist(items.filter((item) => item.is_active !== false));
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError((prev) =>
        prev ??
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    } finally {
      setWatchlistLoading(false);
    }
  }

  async function loadMe() {
    setMeLoading(true);
    try {
      if (!isAuthed) {
        setMe(null);
        return;
      }
      const response = await chrome.runtime.sendMessage({ type: "GET_ME" });
      if (!response?.ok) {
        throw { message: response?.error ?? "Falha ao carregar uso.", status: response?.status, details: response?.details };
      }
      setMe(response?.data ?? null);
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError((prev) =>
        prev ??
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    } finally {
      setMeLoading(false);
    }
  }

  async function handleAddWatch() {
    setWatchSaving(true);
    setError(null);
    try {
      if (!isAuthed) throw new Error("Faça login para usar.");
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url;
      if (!url) throw new Error("URL da aba ativa não encontrada.");
      const response = await chrome.runtime.sendMessage({ type: "ADD_WATCH_URL", url });
      if (!response?.ok) {
        throw { message: response?.error ?? "Falha ao monitorar URL.", status: response?.status, details: response?.details };
      }
      await loadAlerts();
      await loadWatchlist();
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError(
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    } finally {
      setWatchSaving(false);
    }
  }

  async function handleRemoveWatch(id: number) {
    setError(null);
    try {
      if (!isAuthed) throw new Error("Faça login para usar.");
      const response = await chrome.runtime.sendMessage({ type: "REMOVE_WATCH", id });
      if (!response?.ok) {
        throw { message: response?.error ?? "Falha ao remover monitoramento.", status: response?.status, details: response?.details };
      }
      setWatchlist((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError(
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    }
  }

  async function handleAckAlert(id: number) {
    try {
      if (!isAuthed) throw new Error("Faça login para usar.");
      const response = await chrome.runtime.sendMessage({ type: "ACK_ALERT", id });
      if (!response?.ok) {
        throw { message: response?.error ?? "Falha ao confirmar alerta.", status: response?.status, details: response?.details };
      }
      setAlerts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const e = err as { message?: string; status?: number; details?: unknown };
      setError(
        friendlyErrorMessage({
          error: e?.message,
          status: e?.status,
          details: e?.details,
          apiBase
        })
      );
    }
  }

  async function handleClearHistory() {
    if (!confirm("Limpar todo histórico de análises?")) return;
    setError(null);
    const response = await chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" });
    if (!response?.ok) {
      setError(
        friendlyErrorMessage({
          error: response?.error,
          status: response?.status,
          details: response?.details,
          apiBase
        })
      );
      return;
    }
    setHistory([]);
    await loadMe();
  }

  async function handleClearWatchlist() {
    if (!confirm("Desativar todos os itens monitorados?")) return;
    setError(null);
    const response = await chrome.runtime.sendMessage({ type: "CLEAR_WATCHLIST" });
    if (!response?.ok) {
      setError(
        friendlyErrorMessage({
          error: response?.error,
          status: response?.status,
          details: response?.details,
          apiBase
        })
      );
      return;
    }
    setWatchlist([]);
  }

  async function handleClearAlerts() {
    if (!confirm("Limpar todos os alertas?")) return;
    setError(null);
    const response = await chrome.runtime.sendMessage({ type: "CLEAR_ALERTS" });
    if (!response?.ok) {
      setError(
        friendlyErrorMessage({
          error: response?.error,
          status: response?.status,
          details: response?.details,
          apiBase
        })
      );
      return;
    }
    setAlerts([]);
  }

  async function checkActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url;
      if (!url) {
        setPageStatus("unknown");
        return;
      }
      setPageStatus(isSupportedUrl(url) ? "valid" : "invalid");
    } catch {
      setPageStatus("unknown");
    }
  }

  useEffect(() => {
    checkActiveTab();
    initAuth().then(() => {
      loadHistory();
      loadAlerts();
      loadWatchlist();
      loadMe();
    });
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthed) {
      loadHistory();
      loadAlerts();
      loadWatchlist();
      loadMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authedEmail]);

  useEffect(() => {
    chrome.storage.local.get("popupTheme").then((result) => {
      const stored = result.popupTheme;
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    chrome.storage.local.set({ popupTheme: theme });
  }, [theme]);

  useEffect(() => {
    chrome.storage.local.get("apiBase").then((result) => {
      const stored = result.apiBase;
      if (typeof stored === "string" && stored.trim().length > 0) {
        setApiBase(stored.trim());
      }
    });
  }, []);

  function normalizeApiBase(value: string) {
    const raw = String(value ?? "").trim();
    if (!raw) return "http://localhost:3001";

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error("API base inválida. Ex: http://144.22.199.29:3001");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("API base deve ser http ou https.");
    }
    return parsed.toString().replace(/\/$/, "");
  }

  function hostPermissionForBase(base: string) {
    const parsed = new URL(base);
    return `${parsed.protocol}//${parsed.host}/*`;
  }

  async function handleSaveApiBase() {
    setApiBaseSaving(true);
    setApiBaseInfo(null);
    setError(null);
    try {
      const normalized = normalizeApiBase(apiBase);
      const origin = hostPermissionForBase(normalized);

      const hasPerm: boolean = await new Promise((resolve) => {
        chrome.permissions.contains({ origins: [origin] }, (result) => resolve(Boolean(result)));
      });

      if (!hasPerm) {
        const granted: boolean = await new Promise((resolve) => {
          chrome.permissions.request({ origins: [origin] }, (result) => resolve(Boolean(result)));
        });
        if (!granted) throw new Error("Permissão negada para acessar a API nesse domínio.");
      }

      await chrome.storage.local.set({ apiBase: normalized });
      setApiBase(normalized);
      setApiBaseInfo(`API configurada: ${normalized}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao configurar API.");
    } finally {
      setApiBaseSaving(false);
    }
  }

  const statusCopy =
    pageStatus === "valid"
      ? "Página compatível"
      : pageStatus === "invalid"
      ? "Abra um produto ML/Shopee"
      : "Detectando página...";

  const trendPoints = normalizeTrend(
    (data?.trend?.length ? data.trend : trendFallback).slice(0, 12)
  );
  const trendChange = calculateTrendChange(data?.trend ?? []);
  const unackedAlertsCount = alerts.length;

  async function openExternal(url: string) {
    try {
      await chrome.tabs.create({ url });
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-[420px] w-[360px] p-4 sm:w-[380px] max-sm:w-[320px] max-sm:p-3">
      <section className="mb-3 rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300">Conta</p>
          {isAuthed && (
            <button
              onClick={() => void handleLogout()}
              disabled={authLoading}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline disabled:opacity-60"
            >
              sair
            </button>
          )}
        </div>

        {authLoading && (
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
            Verificando sessão...
          </div>
        )}

        {authInfo && (
          <div className="mt-2 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-2 text-xs text-emerald-200">
            {authInfo}
          </div>
        )}

        {apiBaseInfo && (
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">
            {apiBaseInfo}
          </div>
        )}

        {!authLoading && isAuthed && (
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">
            Logado como <span className="font-semibold text-slate-100">{authedEmail}</span>
          </div>
        )}

        {!authLoading && isAuthed && (
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">
            {meLoading && <p className="text-slate-400">Carregando uso...</p>}
            {!meLoading && me && (
              <div className="flex items-center justify-between gap-2">
                <span>
                  Plano <span className="font-semibold text-slate-100">{me.plan}</span>
                </span>
                <span>
                  Uso hoje{" "}
                  <span className="font-semibold text-slate-100">
                    {me.analysesToday}/{me.dailyAnalysisLimit}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {!authLoading && !isAuthed && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuthMode("login")}
                className={`rounded-full px-3 py-1 text-xs ${
                  authMode === "login"
                    ? "bg-slate-800 text-slate-100"
                    : "border border-slate-800 bg-slate-900/60 text-slate-300"
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthMode("signup")}
                className={`rounded-full px-3 py-1 text-xs ${
                  authMode === "signup"
                    ? "bg-slate-800 text-slate-100"
                    : "border border-slate-800 bg-slate-900/60 text-slate-300"
                }`}
              >
                Criar conta
              </button>
            </div>
            <input
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="email"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="senha"
              type="password"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <button
              onClick={() => void (authMode === "login" ? handleLogin() : handleSignup())}
              disabled={authLoading || !loginEmail.trim() || !loginPassword}
              className="w-full rounded-xl bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authMode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-300">API</p>
            <button
              onClick={() => void handleSaveApiBase()}
              disabled={apiBaseSaving || !apiBase.trim()}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline disabled:opacity-60"
            >
              {apiBaseSaving ? "salvando..." : "salvar"}
            </button>
          </div>
          <input
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="http://localhost:3001"
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Para modo real (API hospedada), cole a URL aqui. Você será solicitado a permitir acesso.
          </p>
        </div>
      </section>

      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-4 text-[rgb(var(--ink))]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-6 -top-10 h-36 w-36 rounded-full bg-amber-400/30 blur-2xl" />
          <div className="absolute right-0 top-8 h-28 w-28 rounded-full bg-rose-500/20 blur-2xl" />
          <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
        </div>

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Zapfllow Intel
                </p>
                {unackedAlertsCount > 0 && (
                  <span className="animate-pulse-soft rounded-full border border-rose-700/60 bg-rose-900/50 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                    {unackedAlertsCount} alerta{unackedAlertsCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-lg font-semibold sm:text-xl">Análise de Concorrência</h1>
              <p className="mt-1 text-sm text-slate-300">
                Mercado Livre e Shopee em tempo real.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-slate-700"
              >
                <span>Escuro</span>
                <span
                  className={`flex h-5 w-9 items-center rounded-full border border-slate-700 px-1 transition ${
                    theme === "dark" ? "bg-slate-800" : "bg-amber-200/70"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full transition ${
                      theme === "dark"
                        ? "translate-x-0 bg-slate-300"
                        : "translate-x-4 bg-amber-500"
                    }`}
                  />
                </span>
                <span>Claro</span>
              </button>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-right text-[11px] text-slate-300">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Status</p>
                <p className="mt-1 text-xs font-semibold text-slate-100">{statusCopy}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="rounded-full bg-slate-800/80 px-2 py-1 text-slate-200">
              {loading ? "Buscando dados..." : "Pronto para analisar"}
            </span>
            {lastUpdated && (
              <span className="text-slate-400">
                Atualizado {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || pageStatus === "invalid"}
            className="mt-4 w-full rounded-xl bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-[1px] hover:shadow-lg hover:shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Analisando..." : "Analisar Concorrência"}
          </button>
          <button
            onClick={() => void handleAddWatch()}
            disabled={watchSaving || pageStatus === "invalid"}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {watchSaving ? "Salvando monitoramento..." : "Monitorar esta URL"}
          </button>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <TrendIcon className="h-4 w-4 text-emerald-300" />
                <span>Trending (últimas 24h)</span>
              </div>
              <span className={trendChange >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {trendChange >= 0 ? "+" : ""}
                {trendChange.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1">
              {trendPoints.map((point, index) => (
                <div
                  key={`trend-${index}`}
                  className="flex-1 rounded-full bg-emerald-400/20"
                  style={{ height: `${Math.round(point * 48) + 8}px` }}
                >
                  <div
                    className="h-full rounded-full bg-emerald-400/70 transition hover:bg-emerald-300"
                    style={{ animationDelay: `${index * 60}ms` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="mt-4 rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-3 max-sm:p-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <StackIcon className="h-4 w-4 text-slate-400" />
            Top 3 similares
          </h2>
          <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">
            {data ? `${data.items.length} itens` : "0 itens"}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {loading && (
            <>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-slate-800" />
                    <div className="h-3 w-14 rounded bg-slate-800" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="h-2 w-16 rounded bg-slate-800" />
                    <div className="h-2 w-12 rounded bg-slate-800" />
                    <div className="h-2 w-14 rounded bg-slate-800" />
                  </div>
                </div>
              ))}
            </>
          )}
          {!loading &&
            (data?.items ?? []).slice(0, 3).map((row) => (
              <div
                key={row.name}
                className="animate-float-in rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="block truncate font-semibold text-slate-100">{row.name}</span>
                    {row.url && (
                      <button
                        onClick={() => void openExternal(String(row.url))}
                        className="mt-0.5 text-[10px] text-slate-400 underline-offset-2 hover:underline"
                      >
                        abrir
                      </button>
                    )}
                  </div>
                  <span className="text-emerald-300">{formatPrice(row.price)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1">
                    <TruckIcon className="h-3 w-3 text-slate-500" />
                    {formatShipping(row.shipping)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CartIcon className="h-3 w-3 text-slate-500" />
                    {row.sales}
                  </span>
                  <span className="flex items-center gap-1">
                    <StarIcon className="h-3 w-3 text-amber-300" />
                    {row.rating}
                  </span>
                </div>
              </div>
            ))}
          {!data && !loading && !error && (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
              {pageStatus === "invalid"
                ? "Abra um produto no Mercado Livre ou Shopee para iniciar."
                : "Clique em “Analisar Concorrência” para buscar dados."}
            </div>
          )}
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-3 max-sm:p-2">
        <p className="text-xs text-slate-300">Preço sugerido (fórmula simples)</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">
            {data ? formatPrice(data.suggestedPrice) : "—"}
          </span>
          <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
            Ajustar margem
          </button>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-3 max-sm:p-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300">Monitorados</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadWatchlist()}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
            >
              atualizar
            </button>
            <button
              onClick={() => void handleClearWatchlist()}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
            >
              limpar
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {watchlistLoading && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
              Carregando monitorados...
            </div>
          )}
          {!watchlistLoading &&
            watchlist.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-300">{marketplaceLabel(item.marketplace)}</span>
                  <button
                    onClick={() => void handleRemoveWatch(item.id)}
                    className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-600"
                  >
                    remover
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <button
                    onClick={() => void openExternal(item.source_url)}
                    className="truncate text-left underline-offset-2 hover:underline"
                  >
                    {item.source_url}
                  </button>
                  <span>
                    {item.last_suggested_price ? formatPrice(Number(item.last_suggested_price)) : "—"}
                  </span>
                </div>
              </div>
            ))}
          {!watchlistLoading && watchlist.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
              Nenhuma URL monitorada ainda.
            </div>
          )}
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-3 max-sm:p-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300">Alertas de preço</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadAlerts()}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
            >
              atualizar
            </button>
            <button
              onClick={() => void handleClearAlerts()}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
            >
              limpar
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {alertsLoading && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
              Carregando alertas...
            </div>
          )}
          {!alertsLoading &&
            alerts.map((item) => (
              <div key={item.id} className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-rose-100">{marketplaceLabel(item.marketplace)}</span>
                  <span className="text-rose-300">
                    {(Number(item.percent_change) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                  <span>{formatPrice(Number(item.previous_price))}</span>
                  <span>→</span>
                  <span>{formatPrice(Number(item.current_price))}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="truncate">{item.source_url}</span>
                  <button
                    onClick={() => void handleAckAlert(item.id)}
                    className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-600"
                  >
                    confirmar
                  </button>
                </div>
              </div>
            ))}
          {!alertsLoading && alerts.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
              Sem alertas não lidos.
            </div>
          )}
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-3 max-sm:p-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <PulseIcon className="h-4 w-4 text-amber-300" />
            <span>Insights rápidos</span>
          </div>
          <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">
            beta
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2">
            <p className="text-slate-400">Média preço</p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">
              {data
                ? formatPrice(
                    data.items.reduce((sum, item) => sum + item.price, 0) / data.items.length
                  )
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2">
            <p className="text-slate-400">Top vendas</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {data ? Math.max(...data.items.map((item) => item.sales)) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2">
            <p className="text-slate-400">Rating médio</p>
            <p className="mt-1 text-sm font-semibold text-amber-300">
              {data
                ? (
                    data.items.reduce((sum, item) => sum + item.rating, 0) / data.items.length
                  ).toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-800 bg-[rgb(var(--panel))] p-3 max-sm:p-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300">Histórico recente</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadHistory()}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
            >
              atualizar
            </button>
            <button
              onClick={() => void handleClearHistory()}
              className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
            >
              limpar
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {historyLoading && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
              Carregando histórico...
            </div>
          )}
          {!historyLoading &&
            history.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-300">
                    {marketplaceLabel(item.marketplace)}
                  </span>
                  <span className="text-emerald-300">{formatPrice(Number(item.suggested_price))}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="truncate">{item.source_url}</span>
                  <span>{new Date(item.created_at).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            ))}
          {!historyLoading && history.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
              Sem análises salvas no Supabase.
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-xl border border-rose-900/60 bg-rose-950/60 p-2 text-xs text-rose-200">
          {error}
          <div className="mt-1 text-[11px] text-rose-200/80">
            Verifique se a API está rodando em <code className="rounded bg-rose-950/40 px-1">{apiBase}</code> e se você está logado.
          </div>
        </div>
      )}
    </div>
  );
}

function calculateTrendChange(values: number[]) {
  if (values.length < 2) return 0;
  const first = values[0] || 1;
  const last = values[values.length - 1];
  return ((last - first) / Math.abs(first)) * 100;
}

function marketplaceLabel(value: "mercado_livre" | "shopee" | "other") {
  if (value === "mercado_livre") return "Mercado Livre";
  if (value === "shopee") return "Shopee";
  return "Outro";
}

function isSupportedUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return (
      hostname.includes("mercadolivre.com") ||
      hostname.includes("mercadolivre.com.br") ||
      hostname.includes("shopee.com.br") ||
      hostname.includes("shopee.com")
    );
  } catch {
    return false;
  }
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M3 17l6-6 4 4 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h7v7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M12 3l9 5-9 5-9-5 9-5z" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 12l9 5 9-5" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 17l9 5 9-5" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path
        d="M3 6h11v9H3zM14 9h4l3 3v3h-7"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="2" strokeWidth="2" />
      <circle cx="17" cy="18" r="2" strokeWidth="2" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path
        d="M6 6h15l-2 8H7L6 6zM6 6L4 3"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.5" strokeWidth="2" />
      <circle cx="18" cy="20" r="1.5" strokeWidth="2" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 3l2.9 5.9L21 10l-4.5 4.4L17.8 21 12 17.8 6.2 21l1.3-6.6L3 10l6.1-1.1L12 3z" />
    </svg>
  );
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path
        d="M3 12h4l2-5 4 10 2-5h4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
