## API integration

O botão "Analisar Concorrência" envia uma mensagem para o background,
que tenta chamar `POST /api/analyze` no backend.

O histórico é carregado via `GET /api/history`.

Sem backend/Supabase configurado, a extensão exibe erro.

Para configurar o endpoint:

- `chrome.storage.local.set({ apiBase: "http://localhost:3001" })`
