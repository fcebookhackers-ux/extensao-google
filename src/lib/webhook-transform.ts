export type WebhookEnvelope = {
  event_type: string;
  timestamp: string;
  data: Record<string, any>;
};

function getByPath(obj: any, path: string) {
  const parts = path.split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function applyTemplateString(str: string, ctx: Record<string, any>) {
  return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, raw) => {
    const v = getByPath(ctx, String(raw));
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  });
}

export function applyTemplateValue(value: any, ctx: Record<string, any>): any {
  if (typeof value === "string") return applyTemplateString(value, ctx);
  if (Array.isArray(value)) return value.map((v) => applyTemplateValue(v, ctx));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = applyTemplateValue(v, ctx);
    return out;
  }
  return value;
}

export function transformPayloadFromJsonTemplate(rawTemplate: string, envelope: WebhookEnvelope) {
  const template = JSON.parse(rawTemplate);
  return applyTemplateValue(template, envelope);
}
