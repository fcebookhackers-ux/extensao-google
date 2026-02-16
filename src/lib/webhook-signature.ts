// Browser-side helpers for webhook signing/verification (HMAC-SHA256)

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function generateWebhookSignature(payload: unknown, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const keyBytes = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyWebhookSignature(payload: string, signatureHex: string, secret: string): Promise<boolean> {
  const expected = await generateWebhookSignature(JSON.parse(payload), secret);
  return timingSafeEqual(hexToBytes(signatureHex), hexToBytes(expected));
}
