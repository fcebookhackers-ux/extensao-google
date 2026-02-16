# Relatório Técnico v2 — Projeto ZapFllow (Arquitetura, Melhorias & Segurança)
**Data:** 2026-02-02  
**Projeto:** ZapFllow — Plataforma web de automação/CRM para WhatsApp  
**Stack:** React 18 + Vite + TypeScript + Tailwind (tokens semânticos) + shadcn-ui/Radix + React Router + TanStack Query + Supabase (Auth + Postgres + RLS + Storage + Edge Functions) + Service Worker (PWA) + Framer Motion.

---

## 1) Objetivo do relatório (v2)
Este documento é uma visão **completa e atualizada** do projeto para orientar **futuras implementações**.

Foco principal:

- **Melhorias para usuários** (UX, produtividade, confiabilidade, offline)
- **Melhorias de segurança** (RLS, SSRF, uploads, Edge Functions, auditoria, LGPD)
- **Escalabilidade e manutenção** (performance, arquitetura de front, padrões por domínio)

> Este relatório é intencionalmente “operacional”: além de descrever o estado atual, propõe um backlog de melhorias com critérios de aceite e riscos.

---

## 2) Visão geral de arquitetura

### 2.1 Frontend
**Tecnologias e padrões:**

- **React Router** para páginas públicas e dashboard.
- **shadcn-ui/Radix** como base de componentes; Tailwind com **tokens semânticos** (ex.: `bg-background`, `text-muted-foreground`).
- **TanStack Query** para caching, paginação, mutações e resiliência.
- **Virtualização** em listas críticas (ex.: Contatos) com `@tanstack/react-virtual`.
- **Motion** com framer-motion + respeito a `prefers-reduced-motion`.
- **PWA/Offline base** via Service Worker: registrado apenas em produção (`src/main.tsx`), com SW avançado em `public/sw-advanced.js`.

### 2.2 Backend (Supabase)
**Componentes:**

- **Auth** (Supabase Auth) para login/cadastro/recuperação.
- **Postgres** com **RLS** como primeira linha de defesa.
- **Storage** para mídia, exports, thumbnails (dependendo do bucket/políticas do projeto).
- **Edge Functions** para:
  - validações (upload, webhook URL)
  - rotinas agendadas/limpeza
  - execução de webhooks
  - exportação/remoção de dados (LGPD)
  - auditoria e funções administrativas

---

## 3) Estrutura do repositório (alto nível)

### 3.1 Pastas principais
- `src/pages/*`: páginas públicas.
- `src/pages/dashboard/*`: páginas autenticadas.
- `src/components/*`: componentes (dashboard, webhooks, analytics, mídia, privacidade etc.).
- `src/hooks/*`: hooks por domínio.
- `src/types/*`: tipos por domínio.
- `supabase/functions/*`: Edge Functions.
- `docs/*`: documentação e relatórios.

### 3.2 Rotas do dashboard (indicativas)
O dashboard cobre domínios amplos: Início, Conversas, Automações (com editor/simulador/versões), Templates, Contatos, Relatórios/Analytics, Configurações, Privacidade/LGPD, Notificações, Saúde do sistema, Auditoria.

---

## 4) Módulos do produto (estado atual)

### 4.1 Onboarding e Help
- Há **wizard/checklist/tours** (Joyride) integrados ao layout do dashboard.
- Central de ajuda (`HelpCenter`) + tour guiado.

**Melhorias sugeridas:**
- Consolidar “definição de sucesso do onboarding” (ex.: conectar WhatsApp, importar contatos, criar automação, publicar 1ª automação).
- Instrumentar com `analytics_events` e dashboards de conversão.

### 4.2 Contatos
- Página com filtros + ações em lote + virtualização.
- Prefetch leve de detalhes.

**Melhorias sugeridas:**
- Offline-first para criação/edição de contato (ver seção 7).
- Indexes/otimizações no banco para filtros frequentes.

### 4.3 Automações
- CRUD com RLS por workspace/permissões.
- Editor e recursos auxiliares (versionamento, validação, simulador).

**Melhorias sugeridas:**
- Reduzir risco de “mutations perigosas” em UI (ações de teste UPDATE/DELETE devem virar ações reais com confirmação + permissões claras).
- Melhorar observabilidade (telemetria de execução, falhas, latência).

### 4.4 Webhooks
- Módulo completo: cadastro, execução, logs, circuit breaker, secrets/rotação.

**Melhorias sugeridas:**
- Hardening SSRF/HTTPS (ver Segurança).
- Retry/backoff com jitter + fila/execução assíncrona.
- Melhor UX de logs: filtros, reenviar evento, agrupamento de falhas.

### 4.5 Mídia (Media Library)
- Upload + biblioteca + tags/pastas + analytics de quota.

**Melhorias sugeridas:**
- Signed URLs sob demanda para evitar `public_url` persistente em dados sensíveis.
- Validação server-side de upload + limites por workspace.

### 4.6 Privacidade/LGPD
- Central de privacidade, requests no banco (`data_export_requests`, `data_deletion_requests`) e Edge Functions de processamento.

**Melhorias sugeridas:**
- Linha do tempo do pedido (requested → processing → completed/failed).
- Política de retenção/expiração e limpeza automática de exports.

---

## 5) Performance, resiliência e caching (arquitetura em 3 camadas)

O projeto já segue um padrão de performance avançado em “3 camadas”:

1. **Service Worker (`sw-advanced.js`)**: cache de recursos (network-first / stale-while-revalidate / cache-first) por tipo.
2. **TanStack Query**: cache, invalidação, staleTime, retries e, quando aplicável, persistência.
3. **Cache/Realtime no front** (ex.: hooks de cache em tempo real): base para UI responsiva e redução de requisições.

**Recomendações v2:**
- Formalizar políticas de cache por domínio (contatos, conversas, automações, webhooks, mídia).
- Padronizar “staleTime” e “refetchOnWindowFocus” por módulo.
- Evitar `select('*')` e limitar colunas sempre que possível.

---

## 6) Segurança (visão consolidada) — riscos e plano de mitigação

### 6.1 RLS e multi-tenant (workspace vs user)
Há coexistência de domínios por `user_id` e por `workspace_id`.

**Risco:** inconsistência de modelo → bugs de permissão e vazamento acidental.

**Recomendação:**
- Criar uma “matriz de ownership” por domínio:
  - **Workspace-owned**: dados compartilhados entre membros, governados por permissões.
  - **User-owned**: dados estritamente do usuário.
- Padronizar políticas e os selects no frontend para refletir o modelo.

### 6.2 Edge Functions: autenticação e autorização
**Risco crítico:** funções expostas com `verify_jwt = false` ou sem validação explícita podem ser chamadas externamente.

**Recomendação v2 (regra de ouro):**
- `verify_jwt = true` **por padrão**, exceto funções realmente públicas.
- Em funções autenticadas, além do JWT, validar:
  - membership do workspace
  - permissões necessárias
  - rate limiting (por IP/usuário)

### 6.3 SSRF (webhooks / URLs externas)
**Riscos típicos:** acesso a IPs privados/metadata endpoints, exfiltração, pivoting.

**Recomendação v2:**
- Enforçar `https://`.
- Bloquear ranges privados/loopback e endpoints de metadata.
- Preferir allowlist por domínio em clientes enterprise.
- Logar tentativas bloqueadas (audit + metrics) para incident response.

### 6.4 Uploads e Storage
**Riscos:** arquivos renomeados, mime spoofing, abuso de storage/custos.

**Recomendação v2:**
- Sempre validar server-side (magic bytes + allowlist MIME + size caps).
- Preferir buckets privados e signed URLs com expiração.
- Quotas por workspace + alertas (já há estrutura de alertas/notificações).

### 6.5 Auditoria e trilha imutável
Há tabelas de auditoria (`audit_events`, `immutable_audit_log`).

**Recomendação v2:**
- Padronizar taxonomia de eventos (action/entity_type/entity_id/metadata).
- Cobrir ações críticas:
  - webhooks: create/update/delete/rotate-secret/test/execute
  - automações: create/publish/pause/delete/version/rollback
  - privacidade: export/deletion request/complete/fail
  - permissões/roles: grant/revoke

### 6.6 Rate limiting
Já existe infraestrutura (`rate_limit_config`, `rate_limit_events`).

**Recomendação v2:**
- Aplicar rate limit antes de:
  - upload
  - disparo de webhook
  - execuções massivas (simulação/execução de automações)
- Criar painéis para detectar abuso e regressões.

---

## 7) Modo Offline v2 (implementado recentemente) — como evoluir para “offline completo”

### 7.1 Estado atual (implementado)
Foram adicionados componentes base para offline-first:

- **Detector de conectividade:** `src/hooks/useOnlineStatus.ts` (dispara evento `sync-pending-changes` ao reconectar).
- **Fila offline em localStorage:** `src/lib/offline-queue.ts` (create/update/delete por tabela).
- **Indicador de status no topo:** `src/components/OnlineStatusIndicator.tsx` (mostra offline ou pendências + ação manual de sync).
- **Mutations com suporte offline:** `src/hooks/useOfflineMutation.ts` (create/update/delete com optimistic update).

**Limitação importante (esperada):**
- Operações offline são guardadas no cliente e sincronizadas depois; conflitos podem ocorrer (ex.: update em registro que mudou no servidor).

### 7.2 Próximos passos para “offline completo”
Para evoluir para “offline completo e seguro”, recomenda-se:

1. **Modelo de conflitos e estratégia de merge**
   - Implementar `version`/`updated_at` como controle de concorrência.
   - Estratégias: last-write-wins (simples), merge por campo, ou “conflict UI”.

2. **Persistência de cache do TanStack Query (por domínio)**
   - Persistir queries críticas localmente (ex.: contatos, conversas) para leitura offline.
   - Definir política de expiração e invalidação.

3. **Escopo offline por recurso**
   - *P0:* contatos + notas/comentários (se aplicável) + rascunhos.
   - *P1:* automações (draft) e templates.
   - *P2:* conversas (leitura offline limitada) e uploads em modo “pendente”.

4. **Uploads offline (avançado)**
   - Armazenar blobs em IndexedDB e enviar quando online.
   - Exigir UI de status e cancelamento.

5. **Telemetria de sync**
   - Logar falhas de sincronização localmente + emitir notificação quando falhar repetidamente.

---

## 8) Command Palette (produtividade) — recomendações
O dashboard já possui `CommandPalette` global (atalho ⌘/Ctrl+K) para navegação e acesso rápido.

**Evolução v2 sugerida:**
- Unificar busca do topo (Input) com a Command Palette.
- Adicionar comandos por domínio:
  - “Criar contato”, “Importar contatos”, “Criar automação”, “Criar webhook”, “Abrir configurações > Segurança”, etc.
- Adicionar “recentes” persistidos localmente (últimos 10 itens acessados).

---

## 9) Analytics / refresh agendado — recomendações
Há infraestrutura para refresh de analytics via Edge Function (com secret) e cron.

**Evolução v2:**
- Monitorar execução do cron e latência.
- Criar alertas para falha recorrente.
- Separar jobs por domínio (webhooks, mídia, automações) para evitar refresh monolítico.

---

## 10) Refatoração e padrões de engenharia

### 10.1 Páginas/componentes grandes
Há indicação de arquivos grandes (ex.: landing extensa; algumas páginas de dashboard com lógica de fetch/mutation inline).

**Recomendação v2:**
- Extrair “containers” e “presentational components”.
- Centralizar acesso a dados em hooks por domínio.
- Evitar duplicação de tipos (ex.: manter `AutomationListItem` em `src/types` e reutilizar em hooks/páginas).

### 10.2 Padrão de “data access layer”
Para melhorar consistência e segurança:

- Criar `src/data/*` por domínio (contatos, webhooks, automações) encapsulando chamadas Supabase.
- Hooks chamam `data layer`, não `supabase` diretamente (facilita testes e offline).

### 10.3 Critérios de pronto (DoD) v2
Uma feature só é “pronta” se:

- ✅ UI com loading/erro/empty + acessibilidade básica
- ✅ Respeita tokens semânticos (sem cores hardcoded)
- ✅ Backend protegido (RLS + Edge auth quando aplicável)
- ✅ Logs/auditoria para ações sensíveis
- ✅ Estratégia de cache e invalidação definida
- ✅ Teste manual do fluxo principal (e testes automatizados quando possível)

---

## 11) Roadmap v2 (priorizado)

### P0 — Segurança e confiabilidade (curto prazo)
1. Revisão de **verify_jwt** e autorização por função (Edge Functions).
2. Auditoria de **RLS** em todas as tabelas (incluindo tabelas de métricas/analytics).
3. Hardening SSRF (validação + logs + allowlist opcional).
4. Uploads: validação server-side + signed URLs + quotas.
5. Auditoria: taxonomia e cobertura (ações críticas).

### P1 — Offline e produtividade (médio prazo)
1. Persistência do cache do TanStack Query por domínio (leitura offline real).
2. Conflitos de sync (versão/updated_at + UI de conflito quando necessário).
3. Command Palette: recentes persistidos + ações por domínio.

### P1 — UX (médio prazo)
1. Padronizar empty/error states e CTAs.
2. Melhorias em logs (webhooks/automations) e debugging.
3. Onboarding orientado a metas com métricas de sucesso.

### P2 — Escala e integrações (longo prazo)
1. Execução robusta de webhooks (fila, retry/backoff, dead-letter).
2. Relatórios agendados exportáveis (CSV/XLSX/PDF) com jobs.
3. Integrações externas com tokens seguros e histórico de sync.

---

## 12) Referências internas
- Relatório anterior: `docs/relatorio-tecnico-2026-02-01.md`
- Relatórios históricos: `docs/relatorio-tecnico-2026-01-29.md`, `docs/relatorio-tecnico-2026-01-30.md`
- Plano interno: `.lovable/plan.md`
