import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth, requireWorkspaceMembership } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
} as const;

const DEFAULT_JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  ...corsHeaders,
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: DEFAULT_JSON_HEADERS });
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .map((s) => s.replace(/\s+/g, " ")),
    ),
  ).slice(0, 25);
}

type Enrichment = {
  name?: string | null;
  language?: string | null;
  category?: "lead" | "cliente" | "suporte" | string | null;
  interests?: string[];
  sentiment?: "positive" | "neutral" | "negative" | string | null;
  summary?: string | null;
};

async function callGemini(prompt: string): Promise<Enrichment> {
  const apiKey = getEnv("GEMINI_API_KEY");
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("gemini_error", { status: resp.status, body: t.slice(0, 2000) });
    throw new Error(`Gemini error (${resp.status})`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) throw new Error("Gemini returned empty output");

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback: try to extract JSON block
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("Gemini returned non-JSON output");
    parsed = JSON.parse(text.slice(start, end + 1));
  }

  return {
    name: typeof parsed?.name === "string" ? parsed.name.trim() : null,
    language: typeof parsed?.language === "string" ? parsed.language.trim() : null,
    category: typeof parsed?.category === "string" ? parsed.category.trim() : null,
    interests: normalizeStringArray(parsed?.interests),
    sentiment: typeof parsed?.sentiment === "string" ? parsed.sentiment.trim() : null,
    summary: typeof parsed?.summary === "string" ? parsed.summary.trim() : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { userId } = await requireAuth(req, corsHeaders);
    const { contactId } = (await req.json().catch(() => ({}))) as { contactId?: string };
    if (!contactId || typeof contactId !== "string") return json({ error: "Missing contactId" }, 400);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceRoleKey) return json({ error: "Server misconfigured" }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .select("id, user_id, workspace_id, name, phone")
      .eq("id", contactId)
      .maybeSingle();

    if (contactError) {
      console.error("enrich_contact.contact_load_error", { contactId, error: String(contactError) });
      return json({ error: "Failed to load contact" }, 500);
    }
    if (!contact) return json({ error: "Contact not found" }, 404);

    // Basic ownership check (plus workspace membership if applicable)
    if (contact.user_id !== userId) return json({ error: "Forbidden" }, 403);
    if (contact.workspace_id) await requireWorkspaceMembership(userId, contact.workspace_id, corsHeaders);

    const { data: messages, error: msgError } = await admin
      .from("messages")
      .select("content, created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (msgError) {
      console.error("enrich_contact.messages_load_error", { contactId, error: String(msgError) });
      return json({ error: "Failed to load messages" }, 500);
    }

    const contents = (messages ?? [])
      .map((m: any) => (typeof m?.content === "string" ? m.content.trim() : ""))
      .filter(Boolean);

    if (contents.length < 6) {
      return json({
        ok: true,
        skipped: true,
        reason: "not_enough_messages",
        messageCount: contents.length,
      });
    }

    const prompt = `Você é um analista de CRM. Analise mensagens de WhatsApp e retorne APENAS JSON válido (sem markdown), com as chaves:

{"name":string|null,"language":string|null,"category":"lead"|"cliente"|"suporte"|null,"interests":string[],"sentiment":"positive"|"neutral"|"negative"|null,"summary":string|null}

Regras:
- Se não tiver certeza do nome, use null.
- interests: termos curtos (1-3 palavras), sem duplicatas.
- summary: 1-2 frases, sem dados sensíveis desnecessários.

Mensagens (mais recentes primeiro):\n${contents.join("\n")}`;

    const enrichment = await callGemini(prompt);

    const updatePayload = {
      ai_name_suggestion: enrichment.name ?? null,
      ai_category_suggestion: enrichment.category ?? null,
      ai_tags_suggestion: enrichment.interests ?? [],
      ai_sentiment_suggestion: enrichment.sentiment ?? null,
      ai_summary_suggestion: enrichment.summary ?? null,
      ai_enriched_at: new Date().toISOString(),
      ai_review_status: "pending",
      ai_reviewed_at: null,
    };

    const { error: updError } = await admin.from("contacts").update(updatePayload).eq("id", contactId);
    if (updError) {
      console.error("enrich_contact.update_error", { contactId, error: String(updError) });
      return json({ error: "Failed to update contact" }, 500);
    }

    console.log("enrich_contact.ok", {
      contactId,
      userId,
      messageCount: contents.length,
      hasName: Boolean(enrichment.name),
    });

    return json({ ok: true, enrichment });
  } catch (e) {
    // requireAuth throws a Response
    if (e instanceof Response) return e;
    console.error("enrich_contact.unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json({ error: "Internal error" }, 500);
  }
});
