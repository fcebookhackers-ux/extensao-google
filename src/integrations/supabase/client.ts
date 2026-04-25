import * as React from "react";
import { createAuthClient } from "better-auth/react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { Session, User } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qvcanphpifzocejtqdip.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Y2FucGhwaWZ6b2NlanRxZGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODUwMTIsImV4cCI6MjA4NTA2MTAxMn0.4rgWVGicjxB55H4HFrHSQRVrxORkirFsB2HR9lOHYZM";
const API_URL = "https://api.zapfllow.com.br";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function apiFetch(path: string, options: RequestOptions = {}) {
  try {
    // Buscar token diretamente do auth-service com credentials
    let token: string | undefined;
    try {
      const sessionRes = await fetch("https://auth.zapfllow.com.br/api/auth/get-session", {
        credentials: "include",
      });
      const sessionData = await sessionRes.json();
      token = sessionData?.session?.token;
    } catch {
      // sem sessão, continua sem token
    }

    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      return { data: null, error: { message: error } };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

const supabaseDb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

function resolveRedirect(callbackURL?: string) {
  if (!callbackURL) return undefined;
  if (/^https?:\/\//i.test(callbackURL)) return callbackURL;
  return `${window.location.origin}${callbackURL.startsWith("/") ? "" : "/"}${callbackURL}`;
}

const betterAuth = createAuthClient({
  baseURL: "https://auth.zapfllow.com.br",
});

export const authClient = betterAuth;

// Sobrescrever forgetPassword para usar o endpoint correto
const _originalAuthClient = authClient as any;
export const forgetPasswordFixed = async ({ email, redirectTo }: { email: string; redirectTo: string }) => {
  try {
    const res = await fetch("https://auth.zapfllow.com.br/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, redirectTo }),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.message || "Erro ao enviar email" } };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
};
_originalAuthClient.forgetPassword = forgetPasswordFixed;

function normalizeSession(raw: any): { session: Session | null; user: User | null } {
  const session = (raw?.session ?? null) as Session | null;
  const user = ((raw?.user ?? session?.user) ?? null) as User | null;
  return { session, user };
}

async function getSessionCompat() {
  const { data, error } = await authClient.getSession();
  const normalized = normalizeSession(data);
  return {
    data: {
      session: normalized.session,
      user: normalized.user,
    },
    error,
  };
}

async function getUserCompat() {
  const { data, error } = await getSessionCompat();
  return {
    data: { user: data.user },
    error,
  };
}

async function signOutCompat() {
  return authClient.signOut();
}

function onAuthStateChangeCompat(cb: (event: string, session: Session | null) => void) {
  let previousToken: string | null = null;
  let active = true;

  const emit = async () => {
    const { data } = await getSessionCompat();
    if (!active) return;

    const nextToken = (data.session as any)?.token ?? null;
    if (previousToken === null) {
      cb("INITIAL_SESSION", data.session);
    } else if (previousToken !== nextToken) {
      cb(nextToken ? "SIGNED_IN" : "SIGNED_OUT", data.session);
    }
    previousToken = nextToken;
  };

  emit();
  const interval = window.setInterval(emit, 3000);

  return {
    data: {
      subscription: {
        unsubscribe: () => {
          active = false;
          window.clearInterval(interval);
        },
      },
    },
  };
}

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;

export function useSession() {
  const state = authClient.useSession();
  const data = state?.data ? normalizeSession(state.data) : null;
  return { data, isPending: !!state?.isPending };
}

export const supabase: any = {
  ...supabaseDb,
  auth: {
    getSession: getSessionCompat,
    getUser: getUserCompat,
    signOut: signOutCompat,
    onAuthStateChange: onAuthStateChangeCompat,
  },
  from: (table: string) => supabaseDb.from(table),
  rpc: (fn: string, params?: unknown) => supabaseDb.rpc(fn as any, params as any),
  storage: supabaseDb.storage,
  channel: (...args: any[]) => supabaseDb.channel(...args),
  removeChannel: (...args: any[]) => supabaseDb.removeChannel(...args),
};

export { apiFetch };
