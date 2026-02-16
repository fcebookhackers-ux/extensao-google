export type EvolutionAuthConfig = {
  url: string;
  key: string;
  authHeader: string;
  authScheme: string;
};

export function getEvolutionAuthConfig(): EvolutionAuthConfig {
  const url = Deno.env.get("EVOLUTION_API_URL") ?? "";
  const key = Deno.env.get("EVOLUTION_API_KEY") ?? "";
  const authHeader = Deno.env.get("EVOLUTION_API_AUTH_HEADER") ?? "apikey";
  const authScheme = Deno.env.get("EVOLUTION_API_AUTH_SCHEME") ?? "";

  return { url, key, authHeader, authScheme };
}

export function buildEvolutionHeaders(
  config: EvolutionAuthConfig,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) };
  if (config.key) {
    const value = config.authScheme ? `${config.authScheme} ${config.key}` : config.key;
    headers[config.authHeader] = value;
  }
  return headers;
}
