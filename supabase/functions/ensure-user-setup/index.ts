import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth, getServiceRoleKey } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
} as const;

const PRIMARY_WORKSPACE_ID = "e3946d71-98ec-4c08-9adb-9b6ed0e28e2d";

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🔧 [SETUP] Iniciando setup do usuário...");
    console.log("📅 [SETUP] Timestamp:", new Date().toISOString());

    // 1) Auth do usuário (JWT)
    const { userId, email } = await requireAuth(req, corsHeaders);
    console.log("✅ [SETUP] Usuário autenticado:", userId, email);

    // 2) Client admin (service role) para garantir setup
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();
    if (!serviceRoleKey) throw new Error("Server misconfigured: missing service role key");

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const results = {
      user_id: userId,
      email: email ?? null,
      profile: { exists: false, created: false },
      membership: { exists: false, created: false, workspace_id: PRIMARY_WORKSPACE_ID },
      permissions: { can_manage_whatsapp: false },
    };

    // 3) VERIFICAR/CRIAR PROFILE (tabela public.profiles: id (uuid), user_id (uuid), email (text), ...)
    console.log("🔍 [SETUP] Verificando profile...");
    const { data: existingProfile, error: profileCheckError } = await admin
      .from("profiles")
      .select("id, user_id, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileCheckError) {
      console.error("❌ [SETUP] Erro ao buscar profile:", profileCheckError);
      throw profileCheckError;
    }

    if (existingProfile) {
      console.log("✅ [SETUP] Profile já existe:", existingProfile.id);
      results.profile.exists = true;
    } else {
      console.log("📝 [SETUP] Criando profile...");

      const insertPayload = {
        user_id: userId,
        email: email ?? "",
      };
      console.log("📦 [SETUP] Payload profile:", insertPayload);

      const { data: newProfile, error: profileError } = await admin
        .from("profiles")
        .insert(insertPayload)
        .select("id, user_id, email")
        .single();

      if (profileError) {
        // Best-effort: se alguém criou ao mesmo tempo
        const msg = (profileError as any)?.message ?? "";
        console.error("❌ [SETUP] Erro ao criar profile:", profileError);
        if (!msg.toLowerCase().includes("duplicate") && !msg.toLowerCase().includes("unique")) {
          throw profileError;
        }
      } else {
        console.log("✅ [SETUP] Profile criado com sucesso:", newProfile?.id);
        results.profile.created = true;
        results.profile.exists = true;
      }
    }

    // 4) VERIFICAR/CRIAR MEMBERSHIP NO WORKSPACE PRINCIPAL
    console.log("🔍 [SETUP] Verificando membership no workspace principal...");
    const { data: existingMembership, error: membershipCheckError } = await admin
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", PRIMARY_WORKSPACE_ID)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipCheckError) {
      console.error("❌ [SETUP] Erro ao buscar membership:", membershipCheckError);
      throw membershipCheckError;
    }

    if (existingMembership) {
      console.log("✅ [SETUP] Membership já existe. Role:", existingMembership.role);
      results.membership.exists = true;
    } else {
      console.log("👥 [SETUP] Criando membership...");

      // Segurança: NÃO promover automaticamente para admin.
      const membershipData = {
        workspace_id: PRIMARY_WORKSPACE_ID,
        user_id: userId,
        role: "member",
      };
      console.log("📦 [SETUP] Payload membership:", membershipData);

      const { error: membershipError } = await admin.from("workspace_members").insert(membershipData);
      if (membershipError) {
        const msg = (membershipError as any)?.message ?? "";
        console.error("❌ [SETUP] Erro ao criar membership:", membershipError);
        if (!msg.toLowerCase().includes("duplicate") && !msg.toLowerCase().includes("unique")) {
          throw membershipError;
        }
      } else {
        console.log("✅ [SETUP] Membership criado com sucesso!");
        results.membership.created = true;
        results.membership.exists = true;
      }
    }

    // 5) (Opcional) Verificar permissão whatsapp.manage (diagnóstico)
    console.log("🔍 [SETUP] Verificando permissão whatsapp.manage...");
    const { data: hasPerm, error: permError } = await admin.rpc("workspace_has_permission", {
      p_workspace_id: PRIMARY_WORKSPACE_ID,
      p_permission: "whatsapp.manage",
      p_user_id: userId,
    } as any);

    if (permError) {
      console.error("⚠️ [SETUP] Erro ao verificar permissão:", permError);
    } else {
      results.permissions.can_manage_whatsapp = Boolean(hasPerm);
      console.log(
        "🔐 [SETUP] Permissão whatsapp.manage:",
        results.permissions.can_manage_whatsapp ? "✅ Tem" : "❌ Não tem",
      );
    }

    console.log("✅ [SETUP] Setup completo!");
    console.log("📊 [SETUP] Resultados:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Setup do usuário completo",
        results,
        workspace_id: PRIMARY_WORKSPACE_ID,
      }),
      {
        headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("💥 [SETUP] Erro:", error);
    const message = typeof error?.message === "string" ? error.message : "Erro inesperado";

    return new Response(JSON.stringify({ success: false, error: message, stack: error?.stack }), {
      headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
      status: 500,
    });
  }
});
