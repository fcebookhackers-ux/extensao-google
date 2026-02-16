import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth, requirePermission, getServiceRoleKey } from "../_shared/auth-helpers.ts";
import { buildEvolutionHeaders, getEvolutionAuthConfig } from "../_shared/evolution-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const ctx = await requireAuth(req, corsHeaders);

    const { instanceId } = (await req.json().catch(() => ({}))) as { instanceId?: string };
    if (!instanceId) return json({ error: "instanceId is required" }, 400);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();
    if (!serviceRoleKey) return json({ error: "Server misconfigured" }, 500);

    // Admin client (bypass RLS) + permission check by RPC
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Buscar instância
    const { data: instance, error: instanceError } = await admin
      .from("whatsapp_instances")
      .select("id, workspace_id, instance_name")
      .eq("id", instanceId)
      .maybeSingle();

    if (instanceError) {
      console.error("[evolution-disconnect-instance] instance select error:", instanceError);
      return json({ error: "Failed to load instance" }, 500);
    }
    if (!instance) return json({ error: "Instance not found" }, 404);

    // Verificar permissão (whatsapp.manage)
    await requirePermission(ctx.userId, instance.workspace_id, "whatsapp.manage", corsHeaders);

    const evolution = getEvolutionAuthConfig();
    const evolutionUrl = getEnv("EVOLUTION_API_URL").replace(/\/$/, "");

    // Desconectar e deletar instância na Evolution API (não-fatal)
    try {
      const logoutUrl = `${evolutionUrl}/instance/logout/${encodeURIComponent(instance.instance_name)}`;
      const deleteUrl = `${evolutionUrl}/instance/delete/${encodeURIComponent(instance.instance_name)}`;

      const resLogout = await fetch(logoutUrl, {
        method: "DELETE",
        headers: buildEvolutionHeaders(evolution),
      });

      const resDelete = await fetch(deleteUrl, {
        method: "DELETE",
        headers: buildEvolutionHeaders(evolution),
      });

      console.log("[evolution-disconnect-instance] evolution logout:", resLogout.status);
      console.log("[evolution-disconnect-instance] evolution delete:", resDelete.status);
    } catch (evolutionError) {
      console.error("[evolution-disconnect-instance] Evolution API error (non-fatal):", evolutionError);
      // Continue mesmo se falhar - vamos deletar do banco de qualquer forma
    }

    // Deletar do banco de dados
    const { error: deleteError } = await admin.from("whatsapp_instances").delete().eq("id", instanceId);
    if (deleteError) {
      console.error("[evolution-disconnect-instance] instance delete error:", deleteError);
      return json({ error: "Failed to delete instance" }, 500);
    }

    // (Opcional) revogar sessão local do cliente – ele só terá efeito se a app chamar isso.
    // ctx.authHeader disponível aqui caso precise para auditoria.

    return json({ success: true });
  } catch (err) {
    // auth-helpers pode lançar Response para 401/403
    if (err instanceof Response) return err;
    console.error("[evolution-disconnect-instance] Disconnect error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
