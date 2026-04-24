import { validateWebhookUrl } from "../_shared/ssrf-protection.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { withOtel } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ValidateRequest = {
  url: string;
  workspace_id?: string;
};

type ValidateResponse = {
  valid: boolean;
  // Compat: frontend legado usa `error`; novo contrato prefere `reason`
  error?: string;
  reason?: string;
};

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.+$/, "");
}

function hostMatchesAllowlist(hostname: string, allowedDomain: string): boolean {
  const host = normalizeHost(hostname);
  const d = normalizeHost(allowedDomain);
  return host === d || host.endsWith(`.${d}`);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

if (import.meta.main) {
  Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ valid: false, error: "Method not allowed" }, 405);
  }

  return await withOtel(req, "validate-webhook-url", async () => {
    try {
      const payload = (await req.json()) as ValidateRequest;

      if (!payload?.url) {
        console.log("validate-webhook-url: missing url");
        return json(
          { valid: false, error: "URL is required", reason: "URL is required" } satisfies ValidateResponse,
          400,
        );
      }

      // Optional enterprise allowlist per workspace
      if (payload.workspace_id) {
        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return json(
            {
              valid: false,
              error: "Unauthorized",
              reason: "Unauthorized",
            } satisfies ValidateResponse,
            401,
          );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (!supabaseUrl || !supabaseAnonKey) {
          return json(
            { valid: false, error: "Missing Supabase env", reason: "Missing Supabase env" } satisfies ValidateResponse,
            500,
          );
        }

        const token = authHeader.replace("Bearer ", "").trim();
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        // Validate JWT (signing-keys compatible)
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) {
          console.log("validate-webhook-url: unauthorized allowlist check", claimsError);
          return json({ valid: false, error: "Unauthorized", reason: "Unauthorized" } satisfies ValidateResponse, 401);
        }

        // If allowlist exists for workspace, enforce it
        const { data: allowlistRows, error: allowlistError } = await supabase
          .from("webhook_domain_allowlist")
          .select("domain")
          .eq("workspace_id", payload.workspace_id)
          .eq("is_active", true);

        if (allowlistError) {
          console.log("validate-webhook-url: allowlist query failed", allowlistError);
          return json(
            {
              valid: false,
              error: "Failed to check allowlist",
              reason: "Failed to check allowlist",
            } satisfies ValidateResponse,
            500,
          );
        }

        if ((allowlistRows ?? []).length > 0) {
          let hostname = "";
          try {
            hostname = new URL(payload.url).hostname;
          } catch {
            return json(
              { valid: false, error: "Invalid URL format", reason: "Invalid URL format" } satisfies ValidateResponse,
              400,
            );
          }

          const ok = (allowlistRows ?? []).some((r: any) => hostMatchesAllowlist(hostname, String(r?.domain ?? "")));
          if (!ok) {
            console.log("validate-webhook-url: blocked by allowlist", {
              workspace_id: payload.workspace_id,
              url: payload.url,
              hostname,
            });
            return json(
              {
                valid: false,
                error: "Domain not in allowlist",
                reason: "Domain not in allowlist",
              } satisfies ValidateResponse,
              200,
            );
          }
        }
      }

      const validation = await validateWebhookUrl(payload.url);

      if (!validation.isValid) {
        console.log("validate-webhook-url: blocked URL", {
          url: payload.url,
          reason: validation.error,
        });
        return json({
          valid: false,
          error: validation.error,
          reason: validation.error,
        } satisfies ValidateResponse);
      }

      return json({ valid: true } satisfies ValidateResponse);
    } catch (error) {
      console.log("validate-webhook-url: unexpected error", error);
      return json(
        {
          valid: false,
          error: "Failed to validate URL. Please try again.",
          reason: "Failed to validate URL. Please try again.",
        } satisfies ValidateResponse,
        500,
      );
    }
  });
  });
}
