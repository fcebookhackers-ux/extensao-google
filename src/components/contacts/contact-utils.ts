import type { ContactRow, ContactTag } from "@/pages/dashboard/contactsMock";

export const BR_PHONE_REGEX = /^\(\d{2}\) \d{4,5}-\d{4}$/;

export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatBrazilPhone(input: string) {
  const digits = normalizePhoneDigits(input).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (!ddd) return "";
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

export function makeInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export function isDuplicatePhone(rows: ContactRow[], phoneMasked: string, ignoreId?: string) {
  const needle = normalizePhoneDigits(phoneMasked);
  return rows.some((r) => r.id !== ignoreId && normalizePhoneDigits(r.phone) === needle);
}

export function safeCopy(text: string) {
  return navigator.clipboard?.writeText(text);
}

export function tagsToString(tags: ContactTag[]) {
  return tags.join(", ");
}

export function parseTags(value: string): ContactTag[] {
  const raw = value
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Dedup case-insensitive
  const seen = new Set<string>();
  const out: ContactTag[] = [];
  for (const t of raw) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t as ContactTag);
  }
  return out;
}
