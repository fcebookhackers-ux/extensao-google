// Edge Function: sync-yjs
// CRDT sync for contacts/automations using Yjs binary state in yjs_state columns.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0?target=deno";
import * as Y from "https://esm.sh/yjs@13.6.18?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

type AllowedType = "contact" | "automation";

function mapTypeToTable(t: AllowedType): "contacts" | "automations" {
  if (t === "contact") return "contacts";
  if (t === "automation") return "automations";
  throw new Error("Invalid type");
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return { supabaseUser: null, userId: null };

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) return { supabaseUser: null, userId: null };

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseUser.auth.getClaims(token);
  const userId = data?.claims?.sub ?? null;
  if (error || !userId) return { supabaseUser: null, userId: null };
  return { supabaseUser, userId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const typeParam = String(url.searchParams.get("type") || "");
    const id = String(url.searchParams.get("id") || "");
    if (!typeParam || !id) return json({ error: "Missing type or id" }, 400);

    if (typeParam !== "contact" && typeParam !== "automation") return json({ error: "Invalid type" }, 400);
    const type = typeParam as AllowedType;

    const { supabaseUser, userId } = await requireUser(req);
    if (!supabaseUser || !userId) return json({ error: "Unauthorized" }, 401);

    const table = mapTypeToTable(type);

    if (req.method === "GET") {
      const { data, error } = await supabaseUser
        .from(table)
        .select("yjs_state")
        .eq("id", id)
        .single();
      if (error) return json({ error: error.message }, 400);
      const state = (data?.yjs_state ?? null) as Uint8Array | null;
      if (!state) return new Response(new Uint8Array(), { status: 200, headers: corsHeaders });
      const buf = new Uint8Array(state); // ensure concrete Uint8Array
      return new Response(buf, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/octet-stream" },
      });
    }

    if (req.method === "POST") {
      const startedAt = performance.now();
      let outcome: "success" | "error" = "error";
      let errorCode: string | null = null;

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server misconfigured" }, 500);
      const admin = createClient(supabaseUrl, serviceRoleKey);

      const { data: row, error: rowErr } = await admin
        .from(table)
        .select("yjs_state")
        .eq("id", id)
        .single();
      if (rowErr && rowErr.code !== "PGRST116") return json({ error: rowErr.message }, 400);

      const currentState: Uint8Array | null = row?.yjs_state ?? null;
      const clientUpdate = new Uint8Array(await req.arrayBuffer());

      const ydoc = new Y.Doc();
      if (currentState) {
        try {
          Y.applyUpdate(ydoc, new Uint8Array(currentState));
        } catch (e) {
          console.log("sync-yjs: failed to apply existing state", { error: String(e) });
        }
      }
      try {
        Y.applyUpdate(ydoc, clientUpdate);
      } catch (e) {
        errorCode = "invalid_update";
        return json({ error: "Invalid update" }, 400);
      }

      const merged = Y.encodeStateAsUpdate(ydoc);
      const { error: upErr } = await admin
        .from(table)
        .update({ yjs_state: merged })
        .eq("id", id);
      if (upErr) {
        errorCode = "update_failed";
        return json({ error: upErr.message }, 400);
      }

      outcome = "success";

      // Best-effort instrumentation (service role)
      try {
        const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
        await admin.from("sync_events").insert({
          user_id: userId,
          workspace_id: null,
          entity_type: type,
          status: outcome,
          duration_ms: durationMs,
          error_code: null,
        });
      } catch (e) {
        console.log("sync-yjs: failed to insert sync_events", { error: String(e) });
      }

      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.log("sync-yjs: unexpected error", { error: String(e) });
    return json({ error: "Unexpected error" }, 500);
  }
});
