/* Service Worker (Vite SPA)
 * Estratégia:
 * - Cache-first para assets estáticos (JS/CSS/imagens/fonts)
 * - Network-only para chamadas Supabase (evita cache de respostas autenticadas)
 * - Network-first para navegação (fallback para index em caso offline)
 */

const CACHE_PREFIX = "zapfllow";
// Bump para invalidar caches antigos em clientes que ficaram presos com bundles desatualizados.
const CACHE_VERSION = "v2";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const CORE_ASSETS = ["/", "/index.html", "/favicon.png", "/opengraph-image.png", "/robots.txt"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
              .map((k) => caches.delete(k)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Apenas GET
  if (req.method !== "GET") return;

  // Não cachear Supabase (autenticação, dados sensíveis, etc.)
  if (isSupabaseRequest(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // Cache-first para assets estáticos
  const isAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
      ["style", "script", "image", "font"].includes(req.destination));

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        });
      }),
    );
    return;
  }

  // Network-first para navegação (SPA)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/") || caches.match("/index.html")),
    );
  }
});
