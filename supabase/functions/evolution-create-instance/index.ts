import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth, requirePermission } from "../_shared/auth-helpers.ts";
import { buildEvolutionHeaders, getEvolutionAuthConfig } from "../_shared/evolution-helpers.ts";

// Logs iniciais de diagnóstico
console.log("🚀 [CREATE] Função evolution-create-instance iniciada");
console.log("📅 [CREATE] Timestamp:", new Date().toISOString());

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, authHeader } = await requireAuth(req, corsHeaders);

    console.log("✅ [CREATE] Autenticação OK, User ID:", userId);

    const body = (await req.json().catch(() => ({}))) as { workspaceId?: string };
    console.log("📦 [CREATE] Body recebido:", JSON.stringify(body));
    console.log("🆔 [CREATE] Workspace ID:", body?.workspaceId);

    const { workspaceId } = body;
    if (!workspaceId) return json({ error: "workspaceId is required" }, 400);

    await requirePermission(userId, workspaceId, "whatsapp.manage", corsHeaders);

    console.log("✅ [CREATE] Permissões validadas para workspace:", workspaceId);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Verificar variáveis de ambiente (logs amigáveis)
    const evolution = getEvolutionAuthConfig();
    const EVOLUTION_API_URL = evolution.url;
    const EVOLUTION_API_KEY = evolution.key;
    console.log("🔑 [CREATE] Secrets disponíveis:", {
      EVOLUTION_API_URL: EVOLUTION_API_URL ? "✅ Configurado" : "❌ FALTANDO",
      EVOLUTION_API_KEY: EVOLUTION_API_KEY ? "✅ Configurado" : "❌ FALTANDO",
      url_preview: EVOLUTION_API_URL ? EVOLUTION_API_URL.substring(0, 30) + "..." : null,
    });
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("❌ [CREATE] Credenciais faltando!");
      throw new Error("EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados");
    }

    // Se já existir instância, NÃO recria automaticamente.
    // Isso evita gerar múltiplas instâncias na Evolution e mantém o fluxo consistente.
    // Para gerar um novo QR, o usuário deve desconectar/remover a instância e então criar novamente.
    console.log("🔍 [CREATE] Verificando se já existe instância...");
    const { data: existing, error: existingError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing instance:", existingError);
      return json({ error: "Failed to check existing instance" }, 500);
    }

    if (existing?.id) {
      console.log("⚠️ [CREATE] Instância já existe:", (existing as any)?.instance_name);
      console.log("📊 [CREATE] Status atual:", (existing as any)?.status);
      console.log("🔄 [CREATE] Retornando instância existente");
      console.log("Instance already exists for workspace; returning existing.", {
        workspaceId,
        instanceId: existing.id,
        status: (existing as any).status,
      });
      return json(existing);
    }

    console.log("✨ [CREATE] Nenhuma instância encontrada, criando nova...");

    const instanceName = `zapfllow_${workspaceId.slice(0, 8)}_${Date.now()}`;
    console.log("🏷️ [CREATE] Nome da instância:", instanceName);
    console.log("Creating Evolution instance:", { instanceName, workspaceId });

    // ANTES de fazer a requisição para Evolution:
    const evolutionUrl = getEnv("EVOLUTION_API_URL");

    console.log("📡 [CREATE] Preparando requisição para Evolution API...");
    console.log("🌐 [CREATE] URL:", `${evolutionUrl.replace(/\/$/, "")}/instance/create`);

    const requestBody = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    };
    console.log("📤 [CREATE] Request body:", JSON.stringify(requestBody));

    let createResponse: Response;
    let evolutionData: any;

    try {
      console.log("⏳ [CREATE] Fazendo fetch para Evolution...");
      const fetchStartTime = Date.now();

      createResponse = await fetch(`${evolutionUrl.replace(/\/$/, "")}/instance/create`, {
        method: "POST",
        headers: buildEvolutionHeaders(evolution, { "content-type": "application/json" }),
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`⏱️ [CREATE] Fetch concluído em ${fetchDuration}ms`);
      console.log("📊 [CREATE] Status HTTP:", createResponse.status);
      console.log("📊 [CREATE] Status Text:", createResponse.statusText);

      // Ler resposta como texto primeiro
      const responseText = await createResponse.text();
      console.log(
        "📥 [CREATE] Response body (raw):",
        (responseText?.substring?.(0, 1000) ?? responseText) || "<empty>",
      );

      if (!responseText) {
        console.error("❌ [CREATE] Resposta vazia!");
        throw new Error("Evolution API retornou resposta vazia");
      }

      // Tentar parsear JSON
      try {
        evolutionData = JSON.parse(responseText);
        console.log("✅ [CREATE] JSON parseado com sucesso");
        console.log(
          "📦 [CREATE] Dados:",
          JSON.stringify(evolutionData)?.substring?.(0, 500) ?? "<unstringifiable>",
        );
      } catch (parseError: any) {
        console.error("❌ [CREATE] Erro ao parsear JSON:", parseError?.message);
        console.error("📄 [CREATE] Texto que falhou:", responseText.substring(0, 500));
        throw new Error(
          `Evolution retornou resposta inválida (não é JSON): ${responseText.substring(0, 200)}`,
        );
      }

      // Verificar se a requisição foi bem-sucedida
      if (!createResponse.ok) {
        console.error("❌ [CREATE] Evolution retornou erro HTTP:", createResponse.status);
        console.error("📄 [CREATE] Body do erro:", responseText.substring(0, 2000));

        let errorMessage = `Evolution API erro ${createResponse.status}`;
        if (evolutionData?.message) errorMessage += `: ${evolutionData.message}`;
        else if (evolutionData?.error) errorMessage += `: ${evolutionData.error}`;

        throw new Error(errorMessage);
      }

      // Validar estrutura da resposta
      console.log("🔍 [CREATE] Validando estrutura da resposta...");

      if (!evolutionData?.instance) {
        console.error("❌ [CREATE] Resposta não tem campo \"instance\"");
        console.error("📦 [CREATE] Estrutura recebida:", Object.keys(evolutionData ?? {}));
        throw new Error('Evolution API não retornou campo "instance"');
      }

      // Alguns deployments retornam instanceName em formatos diferentes.
      const returnedInstanceName =
        evolutionData?.instance?.instanceName ?? evolutionData?.instance?.name ?? evolutionData?.instanceName ?? null;
      if (!returnedInstanceName) {
        console.error("❌ [CREATE] Campo instance.instanceName não existe");
        throw new Error("Evolution API não retornou instanceName");
      }

      console.log("✅ [CREATE] Instância criada com sucesso na Evolution!");
      console.log("🏷️ [CREATE] Instance Name:", returnedInstanceName);

      // QR Code
      const qrCode = evolutionData?.qrcode?.code ?? evolutionData?.qrcode ?? evolutionData?.base64 ?? null;
      if (qrCode) {
        console.log("📱 [CREATE] QR Code gerado com sucesso");
        console.log("📏 [CREATE] Tamanho do QR Code:", String(qrCode).length, "caracteres");
      } else {
        console.warn("⚠️ [CREATE] QR Code não foi gerado");
      }
    } catch (fetchError: any) {
      console.error("💥 [CREATE] Erro no fetch:", fetchError);
      console.error("📛 [CREATE] Error name:", fetchError?.name);
      console.error("💬 [CREATE] Error message:", fetchError?.message);

      const msg = String(fetchError?.message ?? "");
      if (fetchError?.name === "TypeError" && msg.includes("fetch")) {
        console.error("🌐 [CREATE] Erro de rede - URL pode estar inacessível");
        throw new Error(
          "Não foi possível conectar à Evolution API. Verifique se a URL está correta e o servidor está online.",
        );
      }

      if (fetchError?.name === "AbortError" || msg.includes("timeout")) {
        console.error("⏱️ [CREATE] Timeout - servidor demorou muito para responder");
        throw new Error("Evolution API demorou muito para responder (timeout de 30s)");
      }

      if (msg.includes("CORS")) {
        console.error("🔐 [CREATE] Erro de CORS");
        throw new Error("Erro de CORS. Evolution API precisa permitir requisições do Supabase.");
      }

      throw fetchError;
    }
    const evolutionInstanceId = evolutionData?.instance?.instanceId ?? evolutionData?.instanceId ?? null;

    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;
    console.log("Setting webhook:", { webhookUrl, instanceName });

    const webhookResponse = await fetch(
      `${evolutionUrl.replace(/\/$/, "")}/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        method: "POST",
        headers: buildEvolutionHeaders(evolution, { "content-type": "application/json" }),
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: true,
          events: [
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "SEND_MESSAGE",
          ],
        }),
      },
    );

    if (!webhookResponse.ok) {
      const webhookErr = await webhookResponse.text();
      console.error("Webhook setup failed:", {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        body: webhookErr?.slice?.(0, 2000) ?? webhookErr,
      });
      // Não aborta a criação; a UI pode permitir reconfigurar depois.
    }

    console.log("💾 [CREATE] Salvando instância no banco de dados...");
    const { data: instance, error: dbError } = await supabase
      .from("whatsapp_instances")
      .insert({
        workspace_id: workspaceId,
        instance_name: instanceName,
        evolution_instance_id: evolutionInstanceId,
        status: "connecting",
        webhook_url: webhookUrl,
        webhook_events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
      })
      .select("*")
      .single();

    if (dbError) {
      console.error("DB insert failed:", dbError);
      return json({ error: "Failed to persist instance" }, 500);
    }

    // Busca QR Code (se a Evolution expõe)
    console.log("Fetching QR code:", { instanceName });
    const qrResponse = await fetch(`${evolutionUrl.replace(/\/$/, "")}/instance/connect/${encodeURIComponent(instanceName)}`, {
      headers: buildEvolutionHeaders(evolution),
    });

    if (qrResponse.ok) {
      const qrData = await qrResponse.json().catch(() => null);
      const base64 = qrData?.base64 ?? qrData?.qrcode ?? null;
      if (base64) {
        const { error: updErr } = await supabase
          .from("whatsapp_instances")
          .update({ qr_code: base64, status: "qr_ready" })
          .eq("id", instance.id);
        if (updErr) console.error("Failed updating QR:", updErr);
        (instance as any).qr_code = base64;
        (instance as any).status = "qr_ready";
      }
    } else {
      console.warn("QR fetch failed:", await qrResponse.text());
    }

    console.log("✅ [CREATE] Processo completo com sucesso!");
    console.log("📊 [CREATE] Dados finais:", {
      instanceName: (evolutionData?.instance?.instanceName ?? instanceName) as string,
      status: (evolutionData?.instance?.status ?? (instance as any)?.status) as string,
      hasQrCode: !!(evolutionData?.qrcode?.code ?? evolutionData?.qrcode ?? evolutionData?.base64 ?? (instance as any)?.qr_code),
    });

    return json(instance);
  } catch (e) {
    // auth-helpers pode lançar Response para 401/403
    if (e instanceof Response) return e;

    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("Unauthorized") || msg.includes("Missing or invalid authorization") ? 401 : 500;
    console.error("Error in evolution-create-instance:", e);
    return json({ error: msg }, status);
  }
});
