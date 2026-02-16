/**
 * ZapFllow — Security Headers
 *
 * Este módulo centraliza as políticas de segurança HTTP (principalmente CSP) para:
 * - Reuso consistente (Vite dev server, Edge/Proxy, Nginx/Apache, etc.)
 * - Documentação do propósito de cada header
 * - Evolução segura (adicionar/remover origens permitidas conscientemente)
 *
 * IMPORTANTE:
 * - CSP via meta tag é apenas “fallback”. A forma correta é enviar via header HTTP.
 * - Nonce é por-request. Não é possível gerar nonce dinâmico no `vite.config.ts`.
 *   Use as helpers deste arquivo em um servidor/edge que possa gerar nonce.
 */

export type CspOptions = {
  /**
   * Permite hosts de analytics comuns (ex.: Google Analytics).
   * Use somente se realmente habilitar analytics no app.
   */
  enableAnalytics?: boolean;

  /**
   * Nonce para liberar scripts inline estritamente (por request).
   * Ex.: <script nonce="..."> ... </script>
   */
  nonce?: string;

  /**
   * Domínio base do Supabase do projeto.
   * Ex.: https://xxxx.supabase.co
   */
  supabaseUrl?: string;
};

// Mantém o supabase URL explícito (evita abrir para *.supabase.co sem necessidade)
// Caso você troque de projeto, atualize aqui (ou injete via servidor).
export const SUPABASE_URL = "https://qvcanphpifzocejtqdip.supabase.co";

// -----------------------------
// CSP (Content-Security-Policy)
// -----------------------------
// Objetivo:
// - Mitigar XSS bloqueando execução de scripts inline sem nonce
// - Restringir conexões (connect-src) às origens esperadas (ex.: Supabase)
// - Bloquear carregamento de recursos inesperados (img/font/style)
//
// Notas de compatibilidade:
// - `style-src 'unsafe-inline'` é mantido para evitar quebra com libs que injetam style inline.
//   Se quiser endurecer, migre gradualmente para nonce/hash também em style-src.
// - `frame-ancestors 'none'` (CSP) complementa `X-Frame-Options: DENY`.

export function buildCsp(options: CspOptions = {}) {
  const supabaseUrl = options.supabaseUrl ?? SUPABASE_URL;
  const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

  // Hosts comuns para analytics (habilite apenas se necessário).
  const analyticsConnect = options.enableAnalytics
    ? ["https://www.google-analytics.com", "https://analytics.google.com", "https://stats.g.doubleclick.net"]
    : [];
  const analyticsScript = options.enableAnalytics
    ? ["https://www.googletagmanager.com", "https://www.google-analytics.com"]
    : [];

  // Nonce: permite liberar scripts inline estritamente quando necessário.
  // Se `nonce` não for passado, NÃO adicionamos 'unsafe-inline'.
  const scriptNonce = options.nonce ? [`'nonce-${options.nonce}'`] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Bloqueia inline scripts por padrão (sem 'unsafe-inline'); libera via nonce quando fornecido.
    "script-src": ["'self'", ...scriptNonce, ...analyticsScript],
    // Permite estilos inline para compatibilidade (pode ser endurecido futuramente).
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabaseUrl],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabaseUrl, supabaseWs, ...analyticsConnect],
    "frame-src": ["'none'"],
    // Anti-clickjacking (CSP equivalente a X-Frame-Options)
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    // Ajuda a forçar HTTPS em subrequests quando servido em HTTPS
    "upgrade-insecure-requests": [],
  };

  // Serializa no formato correto: "directive value1 value2; directive2 ..."
  return Object.entries(directives)
    .map(([k, values]) => (values.length ? `${k} ${values.join(" ")}` : k))
    .join("; ");
}

/**
 * CSP padrão do projeto.
 * - Strict para scripts (sem unsafe-inline)
 * - Permite Supabase (HTTPS e WSS)
 */
export const CSP_POLICY = buildCsp({
  enableAnalytics: false,
  supabaseUrl: SUPABASE_URL,
});

// -----------------------------
// Outros headers de segurança
// -----------------------------
// X-Frame-Options: DENY
// - Bloqueia a app de ser embutida em iframes (mitiga clickjacking)
// X-Content-Type-Options: nosniff
// - Evita MIME sniffing
// Referrer-Policy: strict-origin-when-cross-origin
// - Minimiza vazamento de URL completa em navegações cross-origin
// Permissions-Policy
// - Restringe APIs sensíveis (camera/mic/geolocation)

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP_POLICY,
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Bloqueia recursos sensíveis por padrão.
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

/**
 * Helper para uso em ambientes que suportam nonce por-request.
 * Exemplo (pseudo):
 *   const nonce = crypto.randomUUID();
 *   const headers = {
 *     ...SECURITY_HEADERS,
 *     'Content-Security-Policy': buildCsp({ nonce, enableAnalytics: false })
 *   }
 */
export function buildSecurityHeaders(options: CspOptions = {}) {
  return {
    ...SECURITY_HEADERS,
    "Content-Security-Policy": buildCsp(options),
  };
}
