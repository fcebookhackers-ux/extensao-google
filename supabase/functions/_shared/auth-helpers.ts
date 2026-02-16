import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

export type AuthContext = {
  userId: string;
  email?: string | null;
  authHeader: string;
};

const DEFAULT_JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...DEFAULT_JSON_HEADERS, ...corsHeaders },
  });
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getServiceRoleKey() {
  return Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

export async function requireAuth(req: Request, corsHeaders: Record<string, string>): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw json({ error: "Missing or invalid authorization" }, 401, corsHeaders);
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw json({ error: "Missing or invalid authorization" }, 401, corsHeaders);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // Evita verificação local (getClaims) que pode ativar polyfills Node no edge-runtime.
  // Aqui validamos via chamada ao Auth API.
  const { data, error } = await supabase.auth.getUser(token);
  const userId = data?.user?.id;
  if (error || !userId) throw json({ error: "Invalid token" }, 401, corsHeaders);

  const email = data.user.email ?? null;
  return { userId, email, authHeader };
}

export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string,
  corsHeaders: Record<string, string>,
) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) throw json({ error: "Server misconfigured" }, 500, corsHeaders);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw json({ error: "Not a member of this workspace" }, 403, corsHeaders);
  }
}

export async function requirePermission(
  userId: string,
  workspaceId: string,
  permission: string,
  corsHeaders: Record<string, string>,
) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) throw json({ error: "Server misconfigured" }, 500, corsHeaders);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Prefer function introduced by workspace migrations.
  const { data, error } = await admin.rpc("workspace_has_permission", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_permission: permission,
  } as any);

  if (error || !data) {
    throw json({ error: `Permission denied: ${permission}` }, 403, corsHeaders);
  }
}
