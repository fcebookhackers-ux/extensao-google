import { z } from "zod";

// Minimal leaked-password mitigation (app-side). This does NOT replace Supabase leaked password protection,
// but blocks very common passwords and enforces stronger complexity.
const COMMON_PASSWORDS = new Set(
  [
    "123456",
    "12345678",
    "123456789",
    "qwerty",
    "password",
    "senha",
    "senha123",
    "admin",
    "admin123",
    "letmein",
    "111111",
    "000000",
    "123123",
    "abc123",
    "iloveyou",
    "welcome",
    "monkey",
    "dragon",
    "football",
    "princess",
    "sunshine",
  ].map((s) => s.toLowerCase()),
);

function categoryCount(pw: string) {
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z\d]/.test(pw);
  return [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
}

export function passwordPolicySchema() {
  return z
    .string()
    .min(10, "Use no mínimo 10 caracteres")
    .max(72, "Use no máximo 72 caracteres")
    .refine((v) => categoryCount(v) >= 3, {
      message: "Use pelo menos 3 destes: maiúscula, minúscula, número, símbolo",
    })
    .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase().trim()), {
      message: "Senha muito comum — escolha outra",
    });
}
