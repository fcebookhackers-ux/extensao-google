import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { getServiceRoleKey } from "../_shared/auth-helpers.ts";

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

function normalizeEventName(evt: string | undefined | null) {
  const e = (evt ?? "").trim();
  if (!e) return "";
  // Evolution costuma mandar em formatos diferentes (ex: QRCODE_UPDATED vs qrcode.updated)
  return e.replace(/\./g, "_").toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = getServiceRoleKey();
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server misconfigured" }, 500);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => null);
    if (!payload) return json({ error: "Invalid JSON" }, 400);

    console.log("Evolution webhook received:", JSON.stringify(payload).slice(0, 4000));

    const eventRaw = payload.event ?? payload.type ?? payload?.data?.event;
    const event = normalizeEventName(eventRaw);
    const instanceName = payload.instance ?? payload.instanceName ?? payload?.data?.instance;
    const data = payload.data ?? payload;

    if (!instanceName) return json({ error: "No instance provided" }, 400);

    const { data: whatsappInstance, error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("*")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (instanceError || !whatsappInstance) {
      console.error("Instance not found:", { instanceName, instanceError });
      return json({ error: "Instance not found" }, 404);
    }

    switch (event) {
      case "QRCODE_UPDATED": {
        const qrcode = data?.qrcode ?? data?.base64 ?? data?.data?.qrcode ?? null;
        console.log("QR Code updated:", { instanceName, hasQr: Boolean(qrcode) });
        if (qrcode) {
          await supabaseAdmin
            .from("whatsapp_instances")
            .update({ qr_code: qrcode, status: "qr_ready" })
            .eq("id", whatsappInstance.id);
        }
        break;
      }
      case "CONNECTION_UPDATE": {
        const state = (data?.state ?? data?.connection?.state ?? data?.data?.state ?? "").toString();
        console.log("Connection update:", { instanceName, state });

        let newStatus: "disconnected" | "connecting" | "connected" = "disconnected";
        if (state === "open") newStatus = "connected";
        else if (state === "connecting") newStatus = "connecting";

        const updateData: Record<string, unknown> = {
          status: newStatus,
          last_seen_at: new Date().toISOString(),
        };

        if (newStatus === "connected") {
          updateData.connected_at = new Date().toISOString();
          updateData.qr_code = null;
        }

        const inst = data?.instance ?? data?.data?.instance;
        if (inst?.profilePictureUrl) updateData.profile_picture_url = inst.profilePictureUrl;
        if (inst?.profileName) updateData.profile_name = inst.profileName;
        if (inst?.owner) updateData.phone_number = String(inst.owner).replace("@s.whatsapp.net", "");

        await supabaseAdmin.from("whatsapp_instances").update(updateData).eq("id", whatsappInstance.id);
        break;
      }
      case "MESSAGES_UPSERT": {
        const messages = data?.messages ?? data?.data?.messages ?? [];
        console.log("Messages upsert:", { instanceName, count: Array.isArray(messages) ? messages.length : 0 });

        if (!Array.isArray(messages) || messages.length === 0) break;

        for (const message of messages) {
          try {
            const remoteJid = message?.key?.remoteJid ?? "";
            const fromNumber = String(remoteJid).replace("@s.whatsapp.net", "");
            const toNumber = whatsappInstance.phone_number ?? "";
            const isFromMe = Boolean(message?.key?.fromMe);

            let content = "";
            let messageType:
              | "text"
              | "image"
              | "audio"
              | "video"
              | "document"
              | "sticker"
              | "location"
              | "contact" = "text";
            let mediaUrl: string | null = null;
            let mediaMimeType: string | null = null;

            const m = message?.message;
            if (m?.conversation) {
              content = m.conversation;
              messageType = "text";
            } else if (m?.extendedTextMessage?.text) {
              content = m.extendedTextMessage.text;
              messageType = "text";
            } else if (m?.imageMessage) {
              content = m.imageMessage.caption ?? "";
              messageType = "image";
              mediaUrl = m.imageMessage.url ?? null;
              mediaMimeType = m.imageMessage.mimetype ?? null;
            } else if (m?.videoMessage) {
              content = m.videoMessage.caption ?? "";
              messageType = "video";
              mediaUrl = m.videoMessage.url ?? null;
              mediaMimeType = m.videoMessage.mimetype ?? null;
            } else if (m?.audioMessage) {
              messageType = "audio";
              mediaUrl = m.audioMessage.url ?? null;
              mediaMimeType = m.audioMessage.mimetype ?? null;
            } else if (m?.documentMessage) {
              content = m.documentMessage.fileName ?? "";
              messageType = "document";
              mediaUrl = m.documentMessage.url ?? null;
              mediaMimeType = m.documentMessage.mimetype ?? null;
            }

            const { data: contactId, error: contactErr } = await supabaseAdmin.rpc(
              "upsert_contact_from_whatsapp",
              {
                p_workspace_id: whatsappInstance.workspace_id,
                p_phone: fromNumber,
                p_name: message?.pushName ?? null,
              } as any,
            );

            if (contactErr || !contactId) {
              console.error("Contact upsert failed:", contactErr);
              continue;
            }

            const timestampSeconds = Number(message?.messageTimestamp ?? 0);
            const ts = timestampSeconds
              ? new Date(timestampSeconds * 1000).toISOString()
              : new Date().toISOString();

            const { error: messageErr } = await supabaseAdmin
              .from("whatsapp_messages")
              .upsert(
                {
                  whatsapp_instance_id: whatsappInstance.id,
                  workspace_id: whatsappInstance.workspace_id,
                  contact_id: contactId,
                  message_id: message?.key?.id,
                  from_number: fromNumber,
                  to_number: toNumber,
                  message_type: messageType,
                  content,
                  media_url: mediaUrl,
                  media_mime_type: mediaMimeType,
                  timestamp: ts,
                  is_from_me: isFromMe,
                } as any,
                { onConflict: "whatsapp_instance_id,message_id", ignoreDuplicates: true },
              );

            if (messageErr) console.error("Error saving message:", messageErr);

            const { error: convErr } = await supabaseAdmin.rpc(
              "upsert_whatsapp_conversation",
              {
                p_whatsapp_instance_id: whatsappInstance.id,
                p_workspace_id: whatsappInstance.workspace_id,
                p_contact_id: contactId,
                p_last_message_content: String(content ?? "").slice(0, 200),
                p_last_message_from_me: isFromMe,
              } as any,
            );
            if (convErr) console.error("Conversation upsert failed:", convErr);
          } catch (msgErr) {
            console.error("Error processing message:", msgErr);
          }
        }
        break;
      }
      default:
        console.log("Unhandled event:", { event: eventRaw, normalized: event });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("Webhook error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
