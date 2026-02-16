# Relatório Técnico — Mídia, Webhooks e Melhorias Futuras
**Data:** 2026-01-29  
**Projeto:** App React (Vite + TS) com Supabase (auth + database)  
**Stack principal:** React 18, Vite, TypeScript, Tailwind (tokens semânticos), shadcn-ui, React Router, TanStack Query, Supabase JS v2, Framer Motion.

---

## 1) Visão geral das novas funcionalidades

### 1.1 Gestão de mídia (Media Library)
- **Tipos suportados:** imagens, vídeos, documentos (PDF) e áudio, tipados via `MediaType` em `src/types/media.ts`.
- **Tabela Supabase:** `public.media_library` com campos alinhados ao tipo `MediaFile` (`file_name`, `file_type`, `file_size`, `mime_type`, `tags`, `metadata`, etc.).
- **Buckets de storage:**
  - `media-library` (arquivos originais)
  - `thumbnails` (miniaturas geradas para imagens)
- **Hooks principais:** `useMediaUpload`, `useMediaLibrary`, `useDeleteMedia` em `src/hooks/useMediaUpload.ts`.
- **Componentes principais:**
  - `MediaUploader` em `src/components/media/MediaUploader.tsx`
  - `MediaLibrary` em `src/components/media/MediaLibrary.tsx`

### 1.2 Orquestração de webhooks
- **Tabelas Supabase:**
  - `public.webhooks`: configurações (URL, eventos, headers, secret, retry_config, is_active).
  - `public.webhook_logs`: histórico de entregas, status HTTP, payload, tentativas, erro.
- **Funções e rotinas:**
  - `trigger_webhook(p_webhook_id, p_event_type, p_payload)`: enfileira/dispara execução.
  - `cleanup_old_webhook_logs()`: rotina para retenção de ~30 dias.
- **Hooks React Query:** em `src/hooks/useWebhooks.ts`:
  - `useWebhooks`, `useCreateWebhook`, `useUpdateWebhook`, `useDeleteWebhook`, `useWebhookLogs`, `useTestWebhook`.
- **Componentes principais:**
  - `WebhookManager`, `WebhookForm`, `WebhookLogs` em `src/components/webhooks/*`.

---

## 2) Estado atual de implementação

### 2.1 MediaUploader
- Baseado em `react-dropzone`, com suporte a **drag & drop** e múltiplos arquivos.
- Usa `useMediaUpload` para gerenciar fila, progresso (`UploadProgress`) e estados `uploading` / `completed` / `error`.
- Validação de tipos e tamanho é feita **no cliente** via props `acceptedTypes` e `maxSize` e pela configuração do dropzone.
- Geração de **thumbnails** no cliente usando `<canvas>` para imagens.

### 2.2 MediaLibrary
- Lista os registros da tabela `media_library` via `useMediaLibrary`.
- Suporta filtro por tipo (`image`, `video`, `document`, `audio`) e busca por nome.
- Ações:
  - Seleção opcional de mídia (`onSelect`) para integração com editor de automações.
  - Copiar URL pública para área de transferência.
  - Abrir arquivo em nova aba.
  - Excluir mídia (registro + arquivo + thumbnail) via `useDeleteMedia`.

### 2.3 WebhookManager e hooks
- `useWebhooks` carrega a lista ordenada por `created_at desc`.
- `useCreateWebhook` gera **secret aleatório** e insere registro em `webhooks`.
- `useUpdateWebhook` e `useDeleteWebhook` atualizam ou removem configurações.
- `useWebhookLogs` exibe últimos eventos por webhook (até 100 registros).
- `useTestWebhook` invoca `rpc('trigger_webhook', ...)` com evento de teste.
- `WebhookManager` oferece UI para:
  - Criar/editar webhooks (via `WebhookForm`).
  - Enviar teste.
  - Visualizar logs (via `WebhookLogs`).

---

## 3) Pontos de atenção e riscos (Mídia)

### 3.1 Validação de tipos de arquivo (client + server)
**Estado atual:**
- Client-side: `react-dropzone` limita por `acceptedTypes` e `maxSize`.
- Server-side: dependente apenas de configuração dos buckets e da aplicação que consome a URL.

**Riscos:**
- Upload de tipos maliciosos (por ex. executáveis renomeados) se a validação for apenas pela extensão ou `mime_type` enviado pelo browser.
- Possível abuso de storage (arquivos grandes, muitos uploads).

**Recomendações:**
1. Implementar validação extra no backend (Edge Function) para processar upload via URL assinado de **upload** e rejeitar tipos não esperados.
2. Manter lista branca de MIME types permitidos e validar também o **início do arquivo** (magic bytes) para imagens/vídeos críticos.
3. Adicionar limites por usuário (ex: total de GB ou nº máximo de arquivos) na tabela `media_library`.

### 3.2 Geração de thumbnails
**Estado atual:**
- Realizada no cliente usando `<canvas>` antes do upload para o bucket `thumbnails`.

**Riscos:**
- Thumbnails podem não ser gerados em navegadores sem suporte ou em imagens muito grandes.
- Usuário pode fechar a página antes do upload da thumbnail.

**Recomendações:**
1. Adicionar **fallback server-side** (Edge Function de processamento de imagens) para gerar ou regenerar thumbnails.
2. Criar job de consistência: varrer `media_library` e garantir que imagens tenham thumbnail correspondente.

### 3.3 Compressão de imagens grandes
**Estado atual:**
- Compressão/resize ainda não padronizados; canvas reduz parcialmente, mas sem política clara.

**Riscos:**
- Consumo elevado de largura de banda e tempo de carregamento em listas com muitas imagens grandes.

**Recomendações:**
1. Definir **política de resolução máxima** (ex.: 1920x1080) e qualidade (ex.: 0.8) para uploads de imagem.
2. Implementar compressão no cliente (canvas ou lib específica) e/ou em função de backend ao salvar no bucket.
3. Utilizar versões otimizadas para listagens (thumbs) e apenas a versão original em contextos de visualização detalhada.

### 3.4 Segurança de URLs (signed URLs)
**Estado atual:**
- `public_url` é salvo diretamente; depende da configuração de visibilidade do bucket.

**Riscos:**
- Arquivos potencialmente sensíveis (ex.: PDFs com dados pessoais) expostos publicamente por tempo indeterminado.

**Recomendações:**
1. Tratar buckets de mídia de usuário como **privados** e expor apenas **signed URLs com expiração** (ex.: 5–60 min) para acesso na UI.
2. Evitar armazenar `public_url` definitivo no banco; persistir apenas `storage_path` e gerar URL assinada sob demanda.
3. Em caso de necessidade de URLs públicas (ex.: assets de marketing), separar em buckets específicos com política clara.

---

## 4) Pontos de atenção e riscos (Webhooks)

### 4.1 URLs HTTPS obrigatórias
**Estado atual:**
- `WebhookForm` já valida o formato de URL; precisa garantir enforcement de `https://` também no backend.

**Riscos:**
- Envio de dados sensíveis para endpoints HTTP sem criptografia.

**Recomendações:**
1. Validar `url LIKE 'https://%'` na persistência (FUNÇÃO/constraint ou verificação em Edge Function de criação/edição).
2. Bloquear atualização para `http://` mesmo em chamadas diretas à API (não só pelo formulário).

### 4.2 Retry com exponential backoff
**Estado atual:**
- Há espaço para configuração de retry (`retry_config`), mas a lógica de backoff ainda não está detalhada.

**Riscos:**
- Flood de chamadas em endpoints externos instáveis.
- Dificuldade de debugar falhas sem padrão previsível de retry.

**Recomendações:**
1. Definir modelo padrão de retry: ex.: 3–5 tentativas com backoff exponencial (1s, 2s, 4s, 8s...) e jitter.
2. Persistir em `webhook_logs` o `attempt_number` e o próximo agendamento quando houver fila.
3. Implementar execução via **Edge Function** + fila (cron/queue) em vez de RPC síncrono único.

### 4.3 Validação de signatures
**Estado atual:**
- Secret é gerado e armazenado, mas validação do lado consumidor é responsabilidade do sistema externo.

**Riscos:**
- Endpoints configurados sem validação de assinatura podem ser abusados por terceiros que conhecem a URL.

**Recomendações:**
1. Documentar claramente o esquema de assinatura, ex.:
   - Header: `X-App-Signature`
   - Algoritmo: `HMAC-SHA256(secret, body)`
   - Formato: hex ou base64.
2. Incluir no painel de webhooks um **exemplo de verificação** em Node/Python/PHP para facilitar adoção correta.
3. Permitir rotação de secrets (novo secret + período de convivência, se necessário).

### 4.4 Retenção de logs (30 dias)
**Estado atual:**
- Função `cleanup_old_webhook_logs` implementada para limpar registros antigos.

**Riscos:**
- Se não for agendada, a tabela pode crescer indefinidamente.

**Recomendações:**
1. Configurar **cron job** (Supabase Scheduled Function) chamando `cleanup_old_webhook_logs` diariamente.
2. Documentar claramente a política de retenção (30 dias) na UI de logs.

### 4.5 Rate limiting em webhooks
**Estado atual:**
- Há utilitários de rate limit (`rate_limit_config` e `rate_limit_events`) mas ainda não integrados diretamente na execução dos webhooks.

**Riscos:**
- Explosão de tráfego em caso de loops de eventos ou bugs.

**Recomendações:**
1. Integrar chamada a `check_rate_limit` antes de disparar webhooks para um mesmo endpoint.
2. Registrar eventos de bloqueio no log para facilitar diagnóstico.

---

## 5) Documentação e DX (Developer Experience)

### 5.1 Documentar formato de payload dos webhooks
**Estado atual:**
- `WebhookEvent` e `WebhookLog` estão tipados em `src/types/webhooks.ts`, mas a documentação externa ainda é mínima.

**Recomendações:**
1. Criar página de documentação (pode ser markdown no repositório e/ou página no app) com:
   - Estrutura base do payload (`event_type`, `timestamp`, `data`, `metadata`).
   - Exemplos por tipo de evento: `automation.activated`, `message.failed`, `contact.created`, etc.
   - Especificação dos headers enviados (incluindo assinatura).
2. Incluir **exemplo de implementação** de consumidor (Node/Express, etc.).

### 5.2 Documentar fluxo de upload de mídia
**Recomendações:**
1. Diagrama simples dos passos: seleção → compressão → upload para Supabase → inserção em `media_library` → geração de thumbnail.
2. Especificar limites (tamanho máximo, tipos aceitos, políticas de retenção/limpeza).

---

## 6) Melhorias de UX e integração futura

### 6.1 Integração da MediaLibrary com o editor de automações
**Objetivo:** permitir selecionar imagens/vídeos/documentos diretamente em blocos de mensagem.

**Passos sugeridos:**
1. Adicionar botão “Escolher da biblioteca” nos blocos de mensagem que suportam mídia (`MessageBlock` com `imageUrl`, `fileName`, etc.).
2. Abrir `MediaLibrary` em modo de seleção (`selectable=true`, `onSelect` preenchendo a configuração do bloco).
3. Garantir que apenas tipos compatíveis com o bloco sejam exibidos (ex.: apenas imagens para `imageUrl`).

### 6.2 UX de logs e debugging de webhooks
**Melhorias sugeridas:**
1. Filtros por status (sucesso/erro), código HTTP e intervalo de datas.
2. Destaque visual para erros recorrentes.
3. Botão “Reenviar evento” para uma tentativa manual em logs com falha.

---

## 7) Backlog priorizado (relacionado a mídia e webhooks)

### P0 — Segurança e correção
1. Enforçar HTTPS para webhooks no backend.
2. Integrar rate limiting na execução de webhooks.
3. Revisar política de visibilidade dos buckets de mídia e adotar signed URLs com expiração.

### P1 — Robustez e experiência do usuário
1. Implementar compressão/resize consistente de imagens.
2. Adicionar fallback server-side para geração de thumbnails.
3. Agendar rotina `cleanup_old_webhook_logs` (30 dias).

### P2 — Produto e DX
1. Integrar `MediaLibrary` ao editor de automações.
2. Documentar payloads de webhooks e exemplos de verificação de assinatura.
3. Melhorar filtros e UX dos logs de webhooks.

---

## 8) Definição de pronto (DoD) específica para mídia e webhooks

Uma feature relacionada a **mídia** só é considerada pronta quando:
- ✅ Upload validado no client e no server (tipos e tamanho).
- ✅ Arquivo armazenado em bucket adequado com política de acesso clara.
- ✅ Thumbnail gerado (ou marcado para geração assíncrona) e usado em listagens.
- ✅ UI com estados de loading/erro e feedbacks claros (toasts).

Uma feature relacionada a **webhooks** só é considerada pronta quando:
- ✅ URL validada como HTTPS no client e no server.
- ✅ Secret gerado de forma segura e exibido apenas quando necessário.
- ✅ Assinatura documentada e testada com exemplo real.
- ✅ Retry com estratégia definida (backoff) e registrado em logs.
- ✅ Logs com retenção controlada (30 dias) e visibilidade adequada no painel.
