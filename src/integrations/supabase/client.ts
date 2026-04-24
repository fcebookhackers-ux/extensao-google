// Novo cliente de autenticação - substitui o supabase client
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "https://auth.zapfllow.com.br",
});

export const { signIn, signUp, signOut, useSession } = authClient;

// Cliente para queries no banco (PostgREST)
const API_URL = "https://api.zapfllow.com.br";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function apiFetch(path: string, options: RequestOptions = {}) {
  const session = await authClient.getSession();
  const token = session?.data?.session?.token;

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
    throw new Error(error);
  }

  return res.json();
}

// API de banco de dados - substitui supabase.from()
export const db = {
  from: (table: string) => ({
    select: (columns = "*") => ({
      eq: (col: string, val: unknown) =>
        apiFetch(`/${table}?${col}=eq.${val}&select=${columns}`),
      order: (col: string, { ascending = true } = {}) =>
        apiFetch(`/${table}?order=${col}.${ascending ? "asc" : "desc"}&select=${columns}`),
      limit: (n: number) =>
        apiFetch(`/${table}?limit=${n}&select=${columns}`),
      single: () =>
        apiFetch(`/${table}?limit=1&select=${columns}`),
      then: (resolve: (data: unknown) => void) =>
        apiFetch(`/${table}?select=${columns}`).then(resolve),
    }),
    insert: (data: unknown) =>
      apiFetch(`/${table}`, { method: "POST", body: data }),
    update: (data: unknown) => ({
      eq: (col: string, val: unknown) =>
        apiFetch(`/${table}?${col}=eq.${val}`, { method: "PATCH", body: data }),
    }),
    delete: () => ({
      eq: (col: string, val: unknown) =>
        apiFetch(`/${table}?${col}=eq.${val}`, { method: "DELETE" }),
    }),
  }),
};
 // Compatibilidade retroativa - mantém "supabase" funcionando nos hooks existentes
export const supabase = {
  auth: {
    getSession: () => authClient.getSession(),
    getUser: () => authClient.getSession().then(s => ({ data: { user: s?.data?.user ?? null }, error: null })),
    signOut: () => authClient.signOut(),
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      authClient.oneTapClient?.();
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  from: (table: string) => db.from(table),
  rpc: (fn: string, params?: unknown) =>
    apiFetch(`/rpc/${fn}`, { method: "POST", body: params }),
  storage: {
    from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }),
  },
  channel: () => ({ on: () => ({ subscribe: () => {} }) }),
  removeChannel: () => {},
};