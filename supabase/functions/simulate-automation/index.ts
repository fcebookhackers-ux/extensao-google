 import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
 import { requireAuth } from "../_shared/auth-helpers.ts";
 import { checkRateLimit, rateLimitHeaders } from "../_shared/rate-limit.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 type SimulableEventData =
   | { event_type: "message_received"; contact_id: string; message_body: string; media_url?: string }
   | { event_type: "contact_created"; contact_id: string; name: string; phone: string }
   | { event_type: "webhook_triggered"; webhook_id: string; payload: Record<string, unknown> }
   | { event_type: "scheduled_time"; timestamp: string };
 
 type SimulationStepLog = {
   step_index: number;
   block_id: string;
   block_type: string;
   block_title: string;
   input: Record<string, unknown>;
   output: Record<string, unknown>;
   transformations_applied: string[];
   duration_ms: number;
   status: "success" | "error" | "skipped";
   error_message?: string;
 };
 
 type SimulationResult = {
   automation_id: string;
   automation_name: string;
   event_type: string;
   event_data: Record<string, unknown>;
   execution_log: SimulationStepLog[];
   total_duration_ms: number;
   dry_run: true;
   final_status: "completed" | "error";
 };
 
 // Estrutura do AutomationEditorDoc (simplificada para o simulador)
 type EditorBlock = {
   id: string;
   type: string;
   title: string;
   collapsed?: boolean;
   // campos variam por tipo
   [key: string]: unknown;
 };
 
 type AutomationEditorDoc = {
   id: string;
   name: string;
   status: "draft" | "active" | "paused";
   trigger: Record<string, unknown>;
   blocks: EditorBlock[];
   updatedAt: string;
 };
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
      // Auth (user-triggered endpoint)
      let auth: { userId: string };
      try {
        auth = await requireAuth(req, corsHeaders);
      } catch (e) {
        if (e instanceof Response) return e;
        throw e;
      }

      // Rate limit (per user)
      const rl = await checkRateLimit({
        endpoint: "simulate-automation",
        limitType: "per_user",
        identifier: auth.userId,
        tier: "free",
      });
      if (!rl.allowed) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", resetAt: rl.resetAt }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl) },
          },
        );
      }

     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey =
        Deno.env.get("SERVICE_ROLE_KEY") ??
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
        "";
      if (!supabaseServiceKey) {
        throw new Error("Missing SERVICE_ROLE_KEY");
      }
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const { automation_id, event_data } = (await req.json()) as {
       automation_id: string;
       event_data: SimulableEventData;
     };
 
     console.log(`[simulate-automation] Iniciando simula\u00e7\u00e3o para automation_id=${automation_id}`, event_data);
 
     // Buscar automa\u00e7\u00e3o no banco
     const { data: automation, error: fetchError } = await supabase
       .from("automations")
       .select("id, name, doc")
       .eq("id", automation_id)
       .single();
 
     if (fetchError || !automation) {
       console.error("[simulate-automation] Automa\u00e7\u00e3o n\u00e3o encontrada:", fetchError);
       return new Response(
         JSON.stringify({ error: "Automa\u00e7\u00e3o n\u00e3o encontrada" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
       );
     }
 
     const doc = automation.doc as AutomationEditorDoc;
     console.log(`[simulate-automation] Doc carregado: ${doc.blocks.length} blocos`);
 
     // Simular execu\u00e7\u00e3o (dry-run)
     const execution_log: SimulationStepLog[] = [];
     const startTime = performance.now();
     let context: Record<string, unknown> = { ...event_data };
     let final_status: "completed" | "error" = "completed";
 
     for (let i = 0; i < doc.blocks.length; i++) {
       const block = doc.blocks[i];
       const stepStartTime = performance.now();
       const transformations: string[] = [];
       let status: "success" | "error" | "skipped" = "success";
       let error_message: string | undefined;
 
       try {
         console.log(`[simulate-automation] Executando step ${i}: ${block.type} (${block.title})`);
 
         // L\u00f3gica por tipo de bloco (DRY-RUN, sem side-effects)
         switch (block.type) {
           case "message": {
             const text = String(block.text ?? "");
             // Substituir vari\u00e1veis no texto ({{varName}})
             const replaced = text.replace(/\{\{([^}]+)\}\}/g, (_, varName) => {
               const val = context[varName.trim()];
               if (val !== undefined) {
                 transformations.push(`Substituiu {{${varName}}} por "${val}"`);
                 return String(val);
               }
               return `{{${varName}}}`;
             });
             transformations.push(`Mensagem gerada (dry-run): "${replaced.slice(0, 50)}..."`);
             context.last_message_sent = replaced;
             break;
           }
 
           case "question": {
             const varName = String(block.saveToVariable ?? "resposta_1").replace(/[{}]/g, "").trim();
             // Simula resposta fake
             const fakeResponse = `[RESPOSTA SIMULADA]`;
             context[varName] = fakeResponse;
             transformations.push(`Variavel {{${varName}}} definida como "${fakeResponse}"`);
             break;
           }
 
           case "condition": {
             const field = String(block.field ?? "");
             const operator = String(block.operator ?? "contains");
             const value = String(block.value ?? "");
             const fieldValue = String(context[field.replace(/[{}]/g, "").trim()] ?? "");
 
             let conditionMet = false;
             if (operator === "contains") conditionMet = fieldValue.includes(value);
             else if (operator === "equals") conditionMet = fieldValue === value;
             else if (operator === "starts_with") conditionMet = fieldValue.startsWith(value);
             else if (operator === "ends_with") conditionMet = fieldValue.endsWith(value);
 
             transformations.push(`Condi\u00e7\u00e3o avaliada: ${conditionMet ? "VERDADEIRO" : "FALSO"}`);
             context.last_condition_result = conditionMet;
             // Em produ\u00e7\u00e3o seria necess\u00e1rio seguir branches; aqui simplificamos
             break;
           }
 
           case "delay": {
             const amount = Number(block.amount ?? 5);
             const unit = String(block.unit ?? "minutes");
             transformations.push(`Delay de ${amount} ${unit} (dry-run, n\u00e3o aguardou de fato)`);
             break;
           }
 
           case "action": {
             const actionType = String(block.actionType ?? "add_tag");
             if (actionType === "add_tag") {
               const tags = Array.isArray(block.tags) ? block.tags : [];
               transformations.push(`Tags adicionadas (dry-run): ${tags.join(", ")}`);
             } else if (actionType === "notify_team") {
               transformations.push(`Notifica\u00e7\u00e3o de equipe (dry-run)`);
             } else if (actionType === "webhook") {
               const url = String((block.webhook as { url?: string })?.url ?? "");
               transformations.push(`Webhook chamado (dry-run): ${url}`);
             } else if (actionType === "goto") {
               transformations.push(`Goto (dry-run): n\u00e3o navegou de fato`);
             }
             break;
           }
 
           default:
             transformations.push(`Bloco "${block.type}" n\u00e3o implementado no simulador`);
             status = "skipped";
         }
       } catch (err) {
         status = "error";
         error_message = String(err);
         final_status = "error";
         console.error(`[simulate-automation] Erro no step ${i}:`, err);
       }
 
       const duration_ms = Math.round(performance.now() - stepStartTime);
       execution_log.push({
         step_index: i,
         block_id: block.id,
         block_type: block.type,
         block_title: block.title,
         input: { ...context },
         output: { ...context },
         transformations_applied: transformations,
         duration_ms,
         status,
         error_message,
       });
     }
 
     const total_duration_ms = Math.round(performance.now() - startTime);
 
     const result: SimulationResult = {
       automation_id,
       automation_name: doc.name,
       event_type: event_data.event_type,
       event_data: { ...event_data },
       execution_log,
       total_duration_ms,
       dry_run: true,
       final_status,
     };
 
     console.log(`[simulate-automation] Simula\u00e7\u00e3o conclu\u00edda em ${total_duration_ms}ms`);
 
     return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl) },
     });
   } catch (error) {
     console.error("[simulate-automation] Erro geral:", error);
     return new Response(
       JSON.stringify({ error: String(error) }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
     );
   }
 });
