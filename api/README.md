## Zapfllow Intel API

Endpoints usados pela extensão:

- `POST /api/analyze`
  - Body síncrono: `{ "url": "https://..." }`
  - Body assíncrono: `{ "url": "https://...", "async": true }`
- `GET /api/analyze/jobs/:jobId` (quando Redis/BullMQ estiver ativo)
- `GET /api/history?limit=5`
- `POST /api/watchlist`
- `GET /api/watchlist`
- `DELETE /api/watchlist/:id`
- `GET /api/alerts?limit=10&onlyUnacked=true`
- `POST /api/alerts/:id/ack`

Rodar localmente:

```sh
cd api
npm i
npx playwright install chromium
npm run dev
```

Por padrão escuta em `http://localhost:3001`.

Rodar com Docker (API + Redis):

```sh
copy api\\.env.docker.example api\\.env.docker
# editar SUPABASE_SERVICE_ROLE_KEY no arquivo api/.env.docker
docker compose up -d --build
```

Parar containers:

```sh
docker compose down
```

Variáveis obrigatórias:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAYWRIGHT_HEADLESS` (opcional, padrão `true`)

Variáveis opcionais (produção):

- `SCRAPER_MAX_RETRIES` (padrão `3`)
- `SCRAPER_PROXY_LIST` (lista CSV, ex.: `http://user:pass@host:port,...`)
- `REDIS_URL` (ativa fila BullMQ)
- `QUEUE_CONCURRENCY` (padrão `2`)
- `ANALYZE_JOB_TIMEOUT_MS` (padrão `120000`)
- `AUTO_REFRESH_HOURS` (4 a 6, padrão `5`)
- `ALERT_DROP_THRESHOLD` (padrão `0.03`, equivalente a queda de 3%)

Pode usar o arquivo `api/.env.example` como base.

Antes de usar, aplique a migration que cria a tabela de histórico:

```sh
supabase db push
```

Fluxo real:

- `/api/analyze` abre a URL do produto no Playwright.
- Extrai o título e busca concorrentes no marketplace.
- Salva o resultado em `public.market_competitor_analyses`.
- Com `REDIS_URL`, o endpoint usa fila BullMQ (modo sync espera job; modo async retorna `jobId`).
- Um cron interno dispara refresh automático de URLs recentes a cada 4-6h.
