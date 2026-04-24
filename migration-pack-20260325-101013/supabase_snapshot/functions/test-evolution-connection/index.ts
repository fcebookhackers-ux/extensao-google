import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { requireAuth } from "../_shared/auth-helpers.ts";
import { buildEvolutionHeaders, getEvolutionAuthConfig } from "../_shared/evolution-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
} as const;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth padrão do projeto (signing-keys): valida JWT via helper.
    await requireAuth(req, corsHeaders);

    console.log("🔍 [TEST] Iniciando teste de conexão Evolution API...");

    // 1. Verificar se secrets existem
    const evolution = getEvolutionAuthConfig();
    const EVOLUTION_API_URL = evolution.url;
    const EVOLUTION_API_KEY = evolution.key;

    const diagnostics = {
      timestamp: new Date().toISOString(),
      secrets: {
        EVOLUTION_API_URL: EVOLUTION_API_URL ? "✅ Configurado" : "❌ FALTANDO",
        EVOLUTION_API_KEY: EVOLUTION_API_KEY ? "✅ Configurado" : "❌ FALTANDO",
        EVOLUTION_API_AUTH_HEADER: evolution.authHeader,
        EVOLUTION_API_AUTH_SCHEME: evolution.authScheme || "(nenhum)",
        url_value: EVOLUTION_API_URL ? EVOLUTION_API_URL.substring(0, 30) + "..." : null,
      },
      connection: null as any,
      error: null as any,
    };

    console.log("📊 [TEST] Secrets:", diagnostics.secrets);

    // 2. Validar formato da URL
    if (EVOLUTION_API_URL) {
      if (EVOLUTION_API_URL.endsWith("/")) {
        diagnostics.error = '⚠️ URL termina com "/" - isso pode causar problemas';
      }
      if (!EVOLUTION_API_URL.startsWith("http://") && !EVOLUTION_API_URL.startsWith("https://")) {
        diagnostics.error = "❌ URL deve começar com http:// ou https://";
      }
    }

    // 3. Se não tem credenciais, retornar erro claro
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("❌ [TEST] Credenciais não configuradas");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Credenciais da Evolution API não configuradas no Supabase",
          diagnostics,
          instructions: [
            "1. Acesse: Supabase Dashboard → Settings → Edge Functions",
            "2. Adicione os secrets:",
            "   - EVOLUTION_API_URL (ex: https://evolution.seudominio.com.br)",
            "   - EVOLUTION_API_KEY (sua chave de API)",
            "3. Redeploy das Edge Functions",
          ],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // 4. Testar conexão real com Evolution API
    console.log("📡 [TEST] Tentando conectar em:", EVOLUTION_API_URL);

    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
    const testUrl = `${baseUrl}/instance/fetchInstances`;

    const startTime = Date.now();
    const response = await fetch(testUrl, {
      method: "GET",
      headers: buildEvolutionHeaders(evolution, { "Content-Type": "application/json" }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    const responseTime = Date.now() - startTime;

    diagnostics.connection = {
      url: testUrl,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      ok: response.ok,
    };

    console.log("📊 [TEST] Resposta HTTP:", diagnostics.connection);

    // 5. Tentar ler body da resposta
    let responseBody;
    let responseText = "";

    try {
      responseText = await response.text();
      console.log("📦 [TEST] Body (raw):", responseText.substring(0, 500));

      if (responseText) {
        responseBody = JSON.parse(responseText);
        console.log("✅ [TEST] JSON parseado com sucesso");
      }
    } catch (parseError: any) {
      console.error("⚠️ [TEST] Erro ao parsear JSON:", parseError.message);
      diagnostics.error = `Resposta não é JSON válido: ${responseText.substring(0, 200)}`;
    }

    // 6. Avaliar resultado
    if (response.ok) {
      console.log("✅ [TEST] Conexão bem-sucedida!");

      return new Response(
        JSON.stringify({
          success: true,
          message: "✅ Conexão com Evolution API funcionando perfeitamente!",
          diagnostics,
          instances: responseBody,
          summary: {
            url: EVOLUTION_API_URL,
            status: response.status,
            responseTime: `${responseTime}ms`,
            instancesFound: Array.isArray(responseBody) ? responseBody.length : "N/A",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else {
      // Erro HTTP
      console.error("❌ [TEST] Erro HTTP:", response.status, response.statusText);

      return new Response(
        JSON.stringify({
          success: false,
          message: `❌ Evolution API retornou erro ${response.status}`,
          diagnostics,
          responseBody: responseText.substring(0, 500),
          possibleCauses: [
            response.status === 401 ? "🔑 API Key inválida ou expirada" : null,
            response.status === 403
              ? "🚫 Acesso negado - verifique permissões da API Key"
              : null,
            response.status === 404
              ? "🔍 Endpoint não encontrado - URL pode estar incorreta"
              : null,
            response.status === 500 ? "💥 Erro interno do servidor Evolution" : null,
            response.status === 502 || response.status === 503
              ? "📡 Servidor Evolution offline ou inacessível"
              : null,
          ].filter(Boolean),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
  } catch (error: any) {
    console.error("💥 [TEST] Exception:", error);

    // Diagnosticar tipo de erro
    let errorType = "Desconhecido";
    let suggestions: string[] = [];

    if (error.name === "TypeError" && String(error.message || "").includes("fetch")) {
      errorType = "Erro de Rede";
      suggestions = [
        "🌐 Servidor Evolution pode estar offline",
        "🔒 URL pode estar bloqueada por firewall",
        "📡 Verifique se a URL está acessível publicamente",
      ];
    } else if (error.name === "AbortError" || String(error.message || "").includes("timeout")) {
      errorType = "Timeout";
      suggestions = [
        "⏱️ Servidor demorou mais de 10s para responder",
        "🐌 Servidor pode estar sobrecarregado",
        "🔌 Conexão instável",
      ];
    } else if (String(error.message || "").includes("CORS")) {
      errorType = "Erro de CORS";
      suggestions = [
        "🔐 Evolution API precisa permitir requisições do Supabase",
        "⚙️ Configure CORS no servidor Evolution",
      ];
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: `💥 Erro ao testar conexão: ${errorType}`,
        error: {
          name: error.name,
          message: error.message,
          type: errorType,
        },
        suggestions,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
