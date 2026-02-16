import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(raw: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";

  // +55 (11) 91234-5678
  const withCountry = digits.length >= 12 ? digits : `55${digits}`;
  const country = withCountry.slice(0, 2);
  const area = withCountry.slice(2, 4);
  const rest = withCountry.slice(4);
  const first = rest.length > 8 ? rest.slice(0, 5) : rest.slice(0, 4);
  const last = rest.length > 8 ? rest.slice(5, 9) : rest.slice(4, 8);
  return `+${country} (${area}) ${first}${last ? `-${last}` : ""}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: ptBR });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
