export function extractNamedVariables(template: string): string[] {
  const matches = [...template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]?.trim()).filter(Boolean);
  return Array.from(new Set(matches));
}

export function validateVariableName(name: string) {
  // allow: letters (including accents via unicode), numbers, underscore; must start with letter/_
  // We keep it permissive but forbid spaces and braces.
  return /^[_\p{L}][\p{L}\p{N}_]*$/u.test(name);
}

export function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const k = String(key ?? "").trim();
    const v = data[k];
    return typeof v === "string" && v.length ? v : match;
  });
}
