import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0?target=deno&deno-std=0.208.0";
import { requireAuth } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

type Body = {
  action: string;
  workspace_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: string) {
  return UUID_RE.test(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "Server misconfigured" }, 500);

  let authHeader = "";
  let userId = "";
  try {
    const auth = await requireAuth(req, corsHeaders);
    authHeader = auth.authHeader;
    userId = auth.userId;
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = { action: "" } as Body;
  }

  const action = (body.action ?? "").trim();
  if (!action) return json({ error: "action is required" }, 400);

  const workspaceId = body.workspace_id ?? null;
  if (workspaceId !== null && typeof workspaceId === "string" && workspaceId && !isUuid(workspaceId)) {
    return json({ error: "workspace_id must be a UUID" }, 400);
  }

  const entityType = body.entity_type ?? null;
  const entityId = body.entity_id ?? null;
  if (entityId !== null && typeof entityId === "string" && entityId && !isUuid(entityId)) {
    return json({ error: "entity_id must be a UUID" }, 400);
  }

  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const metadata = (body.metadata ?? {}) as Record<string, unknown>;

  const { error: insertError } = await supabase.from("immutable_audit_log").insert({
    user_id: userId,
    workspace_id: workspaceId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata,
  } as never);

  if (insertError) {
    console.log("log-audit-event: insert failed", insertError);
    // Compliance log should not break UX; but still return 500 for observability in callers.
    return json({ error: "Failed to log" }, 500);
  }

  return json({ ok: true });
});
