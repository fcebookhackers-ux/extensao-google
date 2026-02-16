import { chromium } from "playwright";

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_ITEMS = 20;
const DEFAULT_RETRIES = 3;
const RETRY_BACKOFF_MS = 1300;
const browserArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
const DEFAULT_TIMEOUT_MS = 45000;

const analysisCache = new Map();

function parseProxyEntry(entry) {
  const raw = entry.trim();
  if (!raw) return null;
  try {
    const normalized = raw.includes("://") ? raw : `http://${raw}`;
    const parsed = new URL(normalized);
    return {
      server: `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined
    };
  } catch {
    return null;
  }
}

function loadProxyPool() {
  const raw = process.env.SCRAPER_PROXY_LIST ?? "";
  return raw
    .split(",")
    .map(parseProxyEntry)
    .filter((item) => item && item.server);
}

function parseBrlValue(value) {
  if (!value) return 0;
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseShipping(value) {
  if (!value) return 0;
  if (/gr(á|a)tis/i.test(value)) return 0;
  const money = value.match(/R\$\s*[\d.]+(?:,\d{2})?/i)?.[0];
  if (money) return parseBrlValue(money);
  return 0;
}

function parseSales(value) {
  if (!value) return 0;
  const text = value.toLowerCase().replace(/\s+/g, " ");
  const match = text.match(/([\d.,]+)\s*(mil|k)?/);
  if (!match) return 0;
  const base = Number(match[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(base)) return 0;
  if (match[2] === "mil" || match[2] === "k") return Math.round(base * 1000);
  return Math.round(base);
}

function parseRating(value) {
  if (!value) return 0;
  const match = value.match(/(\d+[.,]?\d*)/);
  if (!match) return 0;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeQuery(value) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 7)
    .join(" ");
}

async function readProductTitle(page) {
  return page.evaluate(() => {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
    if (ogTitle && ogTitle.trim().length > 0) return ogTitle.trim();

    const h1 = document.querySelector("h1")?.textContent;
    if (h1 && h1.trim().length > 0) return h1.trim();

    const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const node of jsonLd) {
      try {
        const parsed = JSON.parse(node.textContent || "{}");
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of candidates) {
          if (item && typeof item === "object" && typeof item.name === "string") return item.name;
        }
      } catch {
        // Ignore invalid JSON-LD blocks.
      }
    }
    return "";
  });
}

function detectMarketplace(url) {
  const hostname = new URL(url).hostname;
  if (hostname.includes("mercadolivre")) return "mercado_livre";
  if (hostname.includes("shopee")) return "shopee";
  return "other";
}

function isContextDestroyedError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    message.includes("execution context was destroyed") ||
    message.includes("most likely because of a navigation") ||
    message.includes("cannot find context with specified id")
  );
}

async function waitForPageStability(page) {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 6000 });
  } catch {
    // ignore
  }
  try {
    await page.waitForLoadState("networkidle", { timeout: 4000 });
  } catch {
    // ignore
  }
  await page.waitForTimeout(250);
}

async function evaluateWithRecovery(page, evaluateFn, arg, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      if (typeof arg === "undefined") return await page.evaluate(evaluateFn);
      return await page.evaluate(evaluateFn, arg);
    } catch (error) {
      lastError = error;
      if (!isContextDestroyedError(error) || attempt === retries) throw error;
      // Shopee often triggers background navigation/rehydration; retry after page settles.
      // eslint-disable-next-line no-await-in-loop
      await waitForPageStability(page);
    }
  }
  throw lastError;
}

async function safeWaitForAnySelector(page, selectors, timeoutMs) {
  const timeout = Math.max(1000, timeoutMs ?? 8000);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // eslint-disable-next-line no-await-in-loop
    for (const selector of selectors) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const handle = await page.$(selector);
        if (handle) return selector;
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(250);
  }
  return null;
}

async function dismissCommonOverlays(page) {
  // Best-effort: cookie banners / modals often break Shopee search results.
  try {
    await evaluateWithRecovery(page, () => {
      const candidates = Array.from(document.querySelectorAll("button, a")).filter((el) => {
        const text = (el.textContent || "").trim().toLowerCase();
        return (
          text === "aceitar" ||
          text === "aceito" ||
          text === "entendi" ||
          text.includes("aceitar") ||
          text.includes("accept") ||
          text.includes("ok")
        );
      });
      for (const el of candidates.slice(0, 3)) {
        try {
          (el instanceof HTMLElement ? el : null)?.click();
        } catch {
          // ignore
        }
      }
    });
  } catch {
    // ignore
  }
}

async function autoScroll(page, steps = 6, stepPx = 900, delayMs = 450) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await evaluateWithRecovery(page, (y) => window.scrollBy(0, y), stepPx, 1);
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(delayMs);
  }
}

async function scrapeMercadoLivre(page, query) {
  const searchUrl = `https://lista.mercadolivre.com.br/${query.replace(/\s+/g, "-").toLowerCase()}`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT_MS });
  await safeWaitForAnySelector(
    page,
    ["li.ui-search-layout__item", ".ui-search-result__wrapper", ".ui-search-results"],
    12000
  );
  await page.waitForTimeout(600);

  const items = await evaluateWithRecovery(page, () => {
    const cards = Array.from(
      document.querySelectorAll("li.ui-search-layout__item, .ui-search-result__wrapper")
    );

    return cards.map((card) => {
      const link =
        card.querySelector("a.ui-search-link, a.ui-search-item__group__element, a.poly-component__title")?.getAttribute(
          "href"
        ) ?? "";
      const absoluteLink = link ? new URL(link, window.location.origin).toString() : "";
      const name =
        card.querySelector("h2.ui-search-item__title, .poly-component__title")?.textContent ?? "";
      const priceWhole = card.querySelector(".andes-money-amount__fraction, .price-tag-fraction")?.textContent ?? "";
      const priceCents = card.querySelector(".andes-money-amount__cents")?.textContent ?? "";
      const shippingText =
        card.querySelector(".ui-search-item__shipping, .poly-component__shipping")?.textContent ?? "";

      // Mercado Livre: the "vendidos" label moves around a lot. Capture any near-card text that looks like sales.
      const soldNodes = Array.from(
        card.querySelectorAll(
          ".ui-search-item__highlight-label, .poly-component__sales, .ui-search-item__group__element, span"
        )
      )
        .map((el) => (el.textContent ?? "").trim())
        .filter(Boolean);
      const soldText = soldNodes.find((t) => /vendid/i.test(t)) ?? "";

      const ratingText =
        card.querySelector(".ui-search-reviews__rating-number, .poly-reviews__rating")?.textContent ??
        "";
      const fallbackPrice = card.textContent?.match(/R\$\s*[\d.]+(?:,\d{2})?/)?.[0] ?? "";

      return {
        url: absoluteLink.trim(),
        name: name.trim(),
        priceText: `${priceWhole}${priceCents ? `,${priceCents}` : ""}`.trim() || fallbackPrice,
        shippingText: shippingText.trim(),
        soldText: soldText.trim(),
        ratingText: ratingText.trim()
      };
    });
  });

  return items
    .map((item) => ({
      name: item.name || "Produto sem nome",
      url: item.url || null,
      price: parseBrlValue(item.priceText),
      shipping: parseShipping(item.shippingText),
      sales: parseSales(item.soldText),
      rating: parseRating(item.ratingText)
    }))
    .filter((item) => item.price > 0)
    .slice(0, MAX_ITEMS);
}

async function scrapeShopee(page, query) {
  const searchUrl = `https://shopee.com.br/search?keyword=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT_MS });
  await dismissCommonOverlays(page);
  await safeWaitForAnySelector(
    page,
    [
      "div[data-sqe='item']",
      ".shopee-search-item-result__item",
      "[data-testid='product-card']",
      "a[href*='/product/']"
    ],
    14000
  );
  await autoScroll(page, 6, 1000, 500);
  await page.waitForTimeout(500);

  const items = await evaluateWithRecovery(page, () => {
    const cards = Array.from(
      document.querySelectorAll("div[data-sqe='item'], .shopee-search-item-result__item")
    );

    return cards.map((card) => {
      const link =
        card.querySelector("a[data-sqe='link'], a[href*='/product/'], a[href]")?.getAttribute("href") ??
        "";
      const absoluteLink = link ? new URL(link, window.location.origin).toString() : "";
      const name =
        card.querySelector("div[data-sqe='name'], .line-clamp-2, [title]")?.textContent ?? "";
      const fullText = card.textContent ?? "";
      const shippingText = /frete gr(á|a)tis/i.test(fullText) ? "Frete grátis" : "";
      const soldMatch = fullText.match(/([\d.,]+\s*(mil|k)?)\s*vendid/i)?.[0] ?? "";

      // Prefer aria-label ratings when present.
      const ariaRating =
        card.querySelector("[aria-label*='de 5'], [aria-label*='de5']")?.getAttribute("aria-label") ?? "";
      const ratingMatch =
        ariaRating.match(/(\d[.,]\d)\s*de\s*5/i)?.[0] ?? fullText.match(/(\d[.,]\d)\s*de\s*5/i)?.[0] ?? "";

      // Shopee prices often appear multiple times (range). Pick the first currency match.
      const priceMatch = fullText.match(/R\$\s*[\d.]+(?:,\d{2})?/i)?.[0] ?? "";

      return {
        url: absoluteLink.trim(),
        name: name.trim(),
        priceText: priceMatch.trim(),
        shippingText,
        soldText: soldMatch.trim(),
        ratingText: ratingMatch.trim()
      };
    });
  });

  // Fallback for Shopee layout/AB tests: read generic product anchors.
  const fallbackItems =
    items.length > 0
      ? []
      : await evaluateWithRecovery(page, () => {
          const seen = new Set();
          const anchors = Array.from(document.querySelectorAll("a[href*='/product/']"));
          return anchors
            .map((anchor) => {
              const href = anchor.getAttribute("href") ?? "";
              const absoluteLink = href ? new URL(href, window.location.origin).toString() : "";
              if (!absoluteLink || seen.has(absoluteLink)) return null;
              seen.add(absoluteLink);

              const card = anchor.closest("section, li, div") ?? anchor;
              const text = (card.textContent ?? anchor.textContent ?? "").trim();
              if (!text) return null;

              const name =
                card.querySelector("div[data-sqe='name'], .line-clamp-2, [title]")?.textContent ??
                anchor.getAttribute("title") ??
                "";
              const priceMatch = text.match(/R\$\s*[\d.]+(?:,\d{2})?/i)?.[0] ?? "";
              const soldMatch = text.match(/([\d.,]+\s*(mil|k)?)\s*vendid/i)?.[0] ?? "";
              const ratingMatch = text.match(/(\d[.,]\d)\s*de\s*5/i)?.[0] ?? "";
              const shippingText = /frete gr(á|a)tis/i.test(text) ? "Frete grátis" : "";

              return {
                url: absoluteLink.trim(),
                name: (name || "").trim(),
                priceText: priceMatch.trim(),
                shippingText,
                soldText: soldMatch.trim(),
                ratingText: ratingMatch.trim()
              };
            })
            .filter(Boolean)
            .slice(0, 80);
        });

  const rawItems = items.length > 0 ? items : fallbackItems;

  return items
    .map((item) => ({
      name: item.name || "Produto sem nome",
      url: item.url || null,
      price: parseBrlValue(item.priceText),
      shipping: parseShipping(item.shippingText),
      sales: parseSales(item.soldText),
      rating: parseRating(item.ratingText)
    }))
    .concat(
      rawItems
        .map((item) => ({
          name: item.name || "Produto sem nome",
          url: item.url || null,
          price: parseBrlValue(item.priceText),
          shipping: parseShipping(item.shippingText),
          sales: parseSales(item.soldText),
          rating: parseRating(item.ratingText)
        }))
        .filter((item) => item.price > 0)
    )
    .filter((item, index, array) => {
      if (item.url) return array.findIndex((x) => x.url === item.url) === index;
      return array.findIndex((x) => x.name === item.name && x.price === item.price) === index;
    })
    .filter((item) => item.price > 0)
    .slice(0, MAX_ITEMS);
}

function computeSuggestedPrice(items) {
  const prices = items.map((item) => item.price).sort((a, b) => a - b);
  if (prices.length === 0) return 0;
  const middle = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0 ? (prices[middle - 1] + prices[middle]) / 2 : prices[middle];
  return Number((median * 0.97).toFixed(2));
}

function buildTrend(items) {
  if (items.length < 2) return [0.4, 0.5, 0.45, 0.6];
  const prices = items.slice(0, Math.min(12, items.length)).map((item) => item.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  return prices.map((value) => Number(((value - min) / range).toFixed(3)));
}

function chooseProxy(attemptIndex, proxyPool) {
  if (!proxyPool.length) return null;
  return proxyPool[attemptIndex % proxyPool.length];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSingleAttempt(url, proxyConfig) {
  const launchOptions = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    args: browserArgs
  };
  if (proxyConfig) launchOptions.proxy = proxyConfig;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    locale: "pt-BR"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT_MS });
    await page.waitForTimeout(1200);

    const rawTitle = await readProductTitle(page);
    const fallbackQuery = new URL(url).pathname.split("/").filter(Boolean).join(" ");
    const query = sanitizeQuery(normalizeWhitespace(rawTitle) || normalizeWhitespace(fallbackQuery));
    if (!query) throw new Error("Não foi possível identificar o produto para pesquisar concorrentes.");

    const marketplace = detectMarketplace(url);
    const items =
      marketplace === "mercado_livre"
        ? await scrapeMercadoLivre(page, query)
        : await scrapeShopee(page, query);
    if (items.length === 0) throw new Error("Não foi possível capturar produtos concorrentes no momento.");

    return {
      receivedAt: Date.now(),
      sourceUrl: url,
      marketplace,
      query,
      items,
      suggestedPrice: computeSuggestedPrice(items),
      trend: buildTrend(items)
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function analyzeMarketplaceUrl(url) {
  const now = Date.now();
  const cached = analysisCache.get(url);
  if (cached && cached.expiresAt > now) return cached.payload;

  const marketplace = detectMarketplace(url);
  if (marketplace === "other") throw new Error("URL não suportada para scraping. Use Mercado Livre ou Shopee.");

  const proxyPool = loadProxyPool();
  const maxRetries = Math.max(1, Number(process.env.SCRAPER_MAX_RETRIES ?? DEFAULT_RETRIES));

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const proxyConfig = chooseProxy(attempt, proxyPool);
    try {
      const payload = await runSingleAttempt(url, proxyConfig);
      analysisCache.set(url, { payload, expiresAt: now + CACHE_TTL_MS });
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha no scraping após múltiplas tentativas.");
}

export async function closeScraper() {
  return Promise.resolve();
}
