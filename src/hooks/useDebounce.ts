import { useDebouncedValue } from "@/hooks/use-debounced-value";

// Compat alias: alguns componentes usam `useDebounce(value, ms)`.
export function useDebounce<T>(value: T, delayMs = 300) {
  return useDebouncedValue(value, delayMs);
}
