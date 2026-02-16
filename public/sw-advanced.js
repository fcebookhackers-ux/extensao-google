/*
 * Service Worker Avançado - Estratégias de Cache em 3 Camadas
 * 
 * Estratégias:
 * - network-first: API dinâmica (webhooks) - tenta rede, fallback cache
 * - stale-while-revalidate: Dados que mudam com frequência (contatos) - serve cache e atualiza em background
 * - cache-first: Media/estático - serve do cache se válido, caso contrário busca
 */

// IMPORTANTE:
// Não cacheamos scripts/HTML do app (chunks do Vite/React) para evitar
// misturar versões e causar erros como "Cannot read properties of null (reading 'useState')".
// Mantemos o SW focado em cache de APIs e assets seguros (ex.: imagens).
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Configuração de TTL (Time To Live) por padrão de URL
const CACHE_STRATEGIES = {
  '/rest/v1/webhooks': { strategy: 'network-first', ttl: 60 * 1000 }, // 1 min
  '/rest/v1/contacts': { strategy: 'stale-while-revalidate', ttl: 5 * 60 * 1000 }, // 5 min
  '/rest/v1/media_library': { strategy: 'cache-first', ttl: 60 * 60 * 1000 }, // 1 hora
  '/rest/v1/automations': { strategy: 'stale-while-revalidate', ttl: 2 * 60 * 1000 }, // 2 min
  '/rest/v1/alert_configs': { strategy: 'network-first', ttl: 60 * 1000 }, // 1 min
  // Apenas para assets seguros (imagens/fonts). Scripts/HTML são explicitamente ignorados.
  '/assets/': { strategy: 'cache-first', ttl: 24 * 60 * 60 * 1000 } // 24 horas
};

// =============================================
// ESTRATÉGIAS DE CACHE
// =============================================

/**
 * Network-first: Tenta buscar da rede, fallback para cache se falhar
 * Ideal para: APIs que precisam de dados atualizados (webhooks, alertas)
 */
async function networkFirst(request, cacheName, ttl) {
  try {
    const response = await fetch(request);
    
    // Cachear apenas respostas bem-sucedidas
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = response.clone();
      
      // Adicionar metadados para TTL
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      headers.set('sw-ttl', ttl.toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      await cache.put(request, cachedResponse);
    }
    
    return response;
  } catch (error) {
    // Fallback para cache se network falhar
    const cached = await caches.match(request);
    if (cached) {
      // Adicionar header para indicar que veio do cache
      const headers = new Headers(cached.headers);
      headers.set('x-served-from-cache', 'true');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate: Serve cache imediatamente e atualiza em background
 * Ideal para: Dados que mudam frequentemente mas toleram staleness (contatos, automações)
 */
async function staleWhileRevalidate(request, cacheName, ttl) {
  const cached = await caches.match(request);
  
  // Revalidar em background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(cacheName).then(cache => {
        const headers = new Headers(response.headers);
        headers.set('sw-cached-at', Date.now().toString());
        headers.set('sw-ttl', ttl.toString());
        
        const cachedResponse = new Response(response.clone().body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
        
        cache.put(request, cachedResponse);
      });
    }
    return response;
  }).catch(() => cached); // Fallback para cache se fetch falhar
  
  // Verificar TTL do cache
  if (cached) {
    const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
    const cacheTtl = parseInt(cached.headers.get('sw-ttl') || '0');
    
    // Se cache ainda válido, retornar imediatamente
    if (Date.now() - cachedAt < cacheTtl) {
      // Adicionar header para debug
      const headers = new Headers(cached.headers);
      headers.set('x-served-from-cache', 'true');
      headers.set('x-cache-age-ms', (Date.now() - cachedAt).toString());
      
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
  }
  
  // Cache expirado ou não existe, aguardar fetch
  return fetchPromise;
}

/**
 * Cache-first: Serve do cache se válido, caso contrário busca da rede
 * Ideal para: Media, assets estáticos que raramente mudam
 */
async function cacheFirst(request, cacheName, ttl) {
  const cached = await caches.match(request);
  
  if (cached) {
    const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
    const cacheTtl = parseInt(cached.headers.get('sw-ttl') || '0');
    
    // Se cache válido, retornar
    if (Date.now() - cachedAt < cacheTtl) {
      const headers = new Headers(cached.headers);
      headers.set('x-served-from-cache', 'true');
      headers.set('x-cache-age-ms', (Date.now() - cachedAt).toString());
      
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
  }
  
  // Cache expirado ou não existe, buscar da rede
  const response = await fetch(request);
  
  if (response.ok) {
    const cache = await caches.open(cacheName);
    const headers = new Headers(response.headers);
    headers.set('sw-cached-at', Date.now().toString());
    headers.set('sw-ttl', ttl.toString());
    
    const cachedResponse = new Response(response.clone().body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
    
    await cache.put(request, cachedResponse);
  }
  
  return response;
}

// =============================================
// EVENT HANDLERS
// =============================================

self.addEventListener('install', (event) => {
  // Skip waiting para ativar imediatamente
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Cleanup de caches antigos
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key => 
            key !== STATIC_CACHE && 
            key !== DYNAMIC_CACHE && 
            key !== API_CACHE
          ).map(key => caches.delete(key))
        );
      }),
      // Assumir controle imediatamente
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apenas GET requests
  if (request.method !== 'GET') return;

  // Evitar cache de navegação/app shell e de bundles (scripts/styles)
  // Isso previne inconsistência entre versões de react/react-dom.
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    return;
  }

  // Ignorar endpoints internos do Vite (dev) e HMR
  if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/@react-refresh')) return;
  
  // Não cachear chamadas auth (sensíveis)
  if (url.pathname.includes('/auth/')) return;

  // Extra segurança: só aplicar cache em imagens/fonts quando for /assets
  if (url.pathname.startsWith('/assets/') && !['image', 'font'].includes(request.destination)) {
    return;
  }
  
  // Determinar estratégia baseado no padrão da URL
  let strategy = null;
  let cacheName = DYNAMIC_CACHE;
  
  for (const [pattern, config] of Object.entries(CACHE_STRATEGIES)) {
    if (url.pathname.includes(pattern)) {
      strategy = config;
      // APIs vão para API_CACHE, resto para DYNAMIC_CACHE
      cacheName = url.pathname.includes('/rest/v1/') ? API_CACHE : DYNAMIC_CACHE;
      break;
    }
  }
  
  // Se não tem estratégia definida, não cachear
  if (!strategy) return;
  
  // Aplicar estratégia
  if (strategy.strategy === 'network-first') {
    event.respondWith(networkFirst(request, cacheName, strategy.ttl));
  } else if (strategy.strategy === 'stale-while-revalidate') {
    event.respondWith(staleWhileRevalidate(request, cacheName, strategy.ttl));
  } else if (strategy.strategy === 'cache-first') {
    event.respondWith(cacheFirst(request, cacheName, strategy.ttl));
  }
});

// Message handler para skip waiting
self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});