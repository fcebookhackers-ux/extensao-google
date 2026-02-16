# Relatório Técnico — Projeto ZapFllow (Arquitetura, Melhorias Visuais/Operacionais & Segurança)
**Data:** 2026-02-03  
**Projeto:** ZapFllow — Plataforma web de automação/CRM para WhatsApp  
**Stack:** React 18 + Vite + TypeScript + Tailwind (tokens semânticos) + shadcn-ui/Radix + React Router + TanStack Query (+ persistência planejada) + Supabase (Auth + Postgres + RLS + Storage + Edge Functions) + Service Worker (PWA) + Framer Motion + Sentry + OpenTelemetry.

---

## 1) Sumário executivo (principais conclusões)

1. **Segurança (P0):** consolidar regra de ouro em Edge Functions (**JWT por padrão**) e auditar função a função o que é público vs autenticado.
2. **Segurança (P0):** padronizar o modelo multi-tenant (workspace vs user) e manter a **matriz de RLS** como “fonte de verdade” (ver `docs/security/rls-matrix.md`).
3. **Segurança (P0):** SSRF para webhooks já está bem endereçado (HTTPS + DNS resolve + bloqueios), mas precisa de **observabilidade + testes + manutenção** (refatorar `ssrf-protection.ts`).
4. **Uploads (P0):** manter validação server-side (magic bytes) e reforçar: quotas por workspace, signed URLs e rate limiting antes de upload.
5. **Operação (P0/P1):** reduzir custo e falhas com disciplina de queries: evitar `select('*')`, limitar colunas, paginação e virtualização como padrão.
6. **Offline (P1):** já há base para offline (fila + indicator). Próximo salto é **persistir cache por domínio** (TanStack Query Persist) e definir estratégia de **conflitos**.
7. **Observabilidade (P1):** OTel + Sentry estão presentes; faltam **SLIs/SLOs mínimos por domínio** e padronização de eventos (telemetria + auditoria).
8. **UX (P1):** padronizar estados (loading/empty/error/offline/sem permissão) e um “UI Playbook” de dashboard para consistência.
9. **Qualidade (P1):** fortalecer Playwright com cenários críticos por domínio + smoke (auth, webhooks, upload, contatos, automações).
10. **Problemas conhecidos (P0 doc):** há risco/ocorrência de **erro de build em Edge Functions** relacionado a imports via `npm:`/resolução do `@supabase/supabase-js` no runtime Deno; documentado e com caminhos de mitigação na seção 7.

---

## 2) Visão de arquitetura (atual)

### 2.1 Frontend

**Estrutura e padrões relevantes**

- Rotas públicas (`src/pages/*`) vs dashboard autenticado (`src/pages/dashboard/*`).
- Layout do dashboard com sidebar + topbar + helpers de produtividade:
  - `src/pages/dashboard/DashboardLayout.tsx`: sidebar, topbar, command palette, onboarding wizard/checklist e tour.
- UI baseada em shadcn/Radix + Tailwind com **tokens semânticos**.
- Motion com framer-motion e componentes de reveal/transition.

**PWA / Offline**

- Service worker em `public/` (inclui `sw-advanced.js`).
- Base offline e fila de mutações no front (ver relatório v2 anterior: `docs/relatorio-tecnico-v2-2026-02-02.md`).

**Camada de dados**

- TanStack Query como backbone de cache e resiliência.
- Existe base de persistência/serialização com compressão (`src/lib/query-persist.ts`).
- Estratégia de cache por domínio já está modelada em `src/config/cache-strategy.ts`.

### 2.2 Backend (Supabase)

- Auth (login/cadastro/recuperação), Postgres + RLS, Storage e Edge Functions.
- Multi-tenant: coexistência de tabelas **workspace-owned** (`workspace_id`) e **user-owned** (`user_id`).
- Edge Functions para operações sensíveis/complexas (validações, processamento async, auditoria e tarefas agendadas).

---

## 3) Estado atual por módulos (o que funciona + gaps + critérios)

> Padrão por módulo: **Estado atual → Melhorias sugeridas → Critérios de aceite**.

### 3.1 Onboarding / Help

**Estado atual**

- Wizard de onboarding + checklist + banner de conclusão.
- Tour guiado (Joyride) e Help Center flutuante.
- Command Palette global no dashboard.

**Melhorias sugeridas**

- Definir “sucesso do onboarding” como metas mensuráveis (ex.: conectar WhatsApp, importar contatos, criar e publicar automação, criar webhook).
- Instrumentar eventos de onboarding para medir conversão.

**Critérios de aceite**

- Checklist reflete 4–6 metas de valor real e é rastreável (percentual de conclusão por usuário/workspace).
- Tour é não-bloqueante e respeita `prefers-reduced-motion`.

### 3.2 Contatos

**Estado atual**

- Virtualização, filtros e ações em lote.

**Melhorias sugeridas**

- Offline-first para criação/edição com resolução de conflitos.
- Otimização de queries (colunas mínimas) e índices para filtros mais usados.

**Critérios de aceite**

- Listagem paginada/virtualizada sempre; sem regressão de UX em mobile.
- Alterações offline sincronizam com feedback claro de sucesso/erro.

### 3.3 Automações

**Estado atual**

- Editor, validação, simulação e versionamento.

**Melhorias sugeridas**

- Observabilidade de execução (latência, falhas por tipo, volumes).
- Controles de segurança e confirmações para ações destrutivas.

**Critérios de aceite**

- Publicar/pausar/rollback registra auditoria com metadados mínimos.
- Simulador registra taxa de sucesso e mensagens de erro consistentes.

### 3.4 Webhooks

**Estado atual**

- Wizard, secrets/rotação, logs e circuit breaker.
- SSRF protection já implementado no back (`supabase/functions/_shared/ssrf-protection.ts`).
- Função de validação de URL (`supabase/functions/validate-webhook-url/index.ts`) com allowlist opcional por workspace.

**Melhorias sugeridas**

- UX de logs: filtros por status, reenvio de evento, agrupamento de falhas.
- Retry/backoff com jitter e, no longo prazo, execução assíncrona com fila + DLQ.

**Critérios de aceite**

- Log de execução contém: request_id/correlation_id, latência, status code e motivo.
- Tentativas bloqueadas por SSRF são auditáveis (contagem + motivo).

### 3.5 Mídia (uploads + library + quota)

**Estado atual**

- Upload, organização por tags/pastas, indicadores de quota e analytics.

**Melhorias sugeridas**

- Preferir signed URLs para acesso a arquivos sensíveis.
- Políticas claras de quota e alertas por workspace.

**Critérios de aceite**

- Upload valida magic bytes server-side e impõe limites (tamanho/mime).
- Quota exibida e alertas disparados em thresholds definidos.

### 3.6 Privacidade / LGPD

**Estado atual**

- Central de privacidade e requests de export/deleção com Edge Functions para processamento.

**Melhorias sugeridas**

- Linha do tempo: requested → processing → completed/failed + razões e retries.
- Retenção e limpeza automática de exports (expiração + job).

**Critérios de aceite**

- Cada request tem status e histórico mínimo de tentativas.
- Download link expira e é revogável.

### 3.7 Notificações / System Health

**Estado atual**

- Centro de notificações e preferências.
- Painéis de saúde do sistema + alertas.

**Melhorias sugeridas**

- SLIs/SLOs por domínio e dashboards mínimos (webhooks, upload, automações, sync offline).

**Critérios de aceite**

- Alarmes disparados por métricas (taxa de falha, latência, quota crítica).

---

## 4) Melhorias visuais (UI/UX) — guia operacional (playbook)

### 4.1 Checklist de UI para qualquer nova tela

**Consistência & design system**

- [ ] Usar **tokens semânticos** (ex.: `bg-background`, `text-muted-foreground`, `border-border`), sem cores hardcoded.
- [ ] Garantir estados de hover/focus/disabled consistentes nos componentes.
- [ ] Tipografia: hierarquia clara (título, subtítulo, corpo, meta).

**Estados padrão (obrigatório)**

- [ ] Loading: skeleton/spinner com layout estável.
- [ ] Empty: mensagem + CTA primário e, quando fizer sentido, CTA secundário.
- [ ] Error: mensagem acionável + retry.
- [ ] Offline: indicação e comportamento degradado previsível.
- [ ] Sem permissão: `NoPermissionState` (ou equivalente) com orientação do que fazer.

**Acessibilidade**

- [ ] Labels (visíveis ou `aria-label`) em inputs.
- [ ] Foco visível e navegação por teclado.
- [ ] Contraste mínimo (verificar em light/dark).

**Mobile (dashboard)**

- [ ] Sidebar colapsa/Sheet em telas pequenas.
- [ ] Tabelas: layout responsivo (colunas essenciais, overflow controlado).

**Motion**

- [ ] Animações coerentes e reduzidas quando `prefers-reduced-motion`.
- [ ] Microinterações: hover/press, transitions curtas e intencionais.

### 4.2 Entregáveis sugeridos

1. **UI Playbook** (doc interno): padrões de páginas (list + filters + actions + table), dialogs, forms, empty/error/offline.
2. **Inventário de componentes críticos**: quais são “blocos oficiais” e onde aplicar.
3. **Padrão de copy em PT-BR**: termos consistentes (ex.: “Automações”, “Webhook”, “Workspace”, “Plano”).

---

## 5) Melhorias operacionais (performance, confiabilidade, offline, DX)

### 5.1 Performance (regras práticas)

- Evitar `select('*')`; selecionar colunas necessárias (especialmente em tabelas com JSON/metadata grandes).
- Sempre considerar o limite padrão do Supabase (1000 rows): usar paginação e/ou cursores.
- Virtualização como padrão em listas de alto volume.
- Prefetch só onde houver ganho real (detalhes de item, rotas frequentemente acessadas).

**Critérios de aceite (performance)**

- Páginas críticas mantêm tempo de interação responsivo (sem travar ao renderizar listas).
- Queries listadas têm paginação e payload mínimo.

### 5.2 Cache e resiliência (TanStack Query)

**Estado**

- Existe base de persistência com compressão (`src/lib/query-persist.ts`).
- Existe estratégia por domínio (`src/config/cache-strategy.ts`).

**Próximos passos sugeridos**

- Persistir apenas domínios com leitura offline relevante (ex.: contatos, conversas em janela curta, automações draft).
- Documentar, por domínio:
  - staleTime, gcTime
  - quando refetch
  - política de retries
  - volume máximo de itens

**Critérios de aceite (cache)**

- Reabrir o app offline mantém leitura para domínios persistidos.
- Persistência não quebra a UX (erros de deserialização são tratados com fallback).

### 5.3 Offline: evolução para “offline completo”

**P0 (mínimo viável) — previsibilidade**

- Definir escopo offline por domínio (o que é “read-only”, o que permite mutation).
- UI clara para “pendências de sync” + ação de sincronização.

**P1 — conflitos**

- Definir controle de concorrência: `updated_at`/versão + estratégia.
- Opções: last-write-wins (simples), merge por campo, ou UI de conflito.

**P2 — uploads offline (avançado)**

- Guardar blobs em IndexedDB e enviar quando online.

### 5.4 Observabilidade (Sentry + OpenTelemetry)

**O que instrumentar primeiro**

- Webhooks: taxa de sucesso, latência, códigos HTTP, top erros.
- Upload: falhas de validação, tamanho médio, tempo total.
- Offline sync: fila pendente, falhas de sync e retries.
- Automações: execuções, falhas por etapa, duração.

**SLIs/SLOs mínimos (sugestão inicial)**

- Webhooks: p95 latency, success rate, retry rate.
- Upload: validações reprovadas vs aprovadas, taxa de erro do storage.
- Auth: taxa de falha no login e latência de sessão.

### 5.5 Testes (Playwright)

**Cenários e2e recomendados (por domínio)**

- Auth: login/cadastro/recovery e acesso ao dashboard.
- Contatos: listar, filtrar, criar, editar, bulk actions.
- Webhooks: criar webhook, validar URL, executar teste, ver logs.
- Mídia: upload válido vs inválido (tipos bloqueados), quota.
- Privacidade: solicitar export e deleção (mock/ambiente de teste), ver status.

---

## 6) Segurança (prioridade alta) — riscos e mitigação

### 6.1 RLS / multi-tenant (workspace vs user)

**Risco**

- Modelo híbrido (`workspace_id` + fallback `user_id`) pode gerar confusão e brechas se o front ou policies não refletirem o ownership correto.

**Mitigação recomendada**

- Manter e evoluir a matriz `docs/security/rls-matrix.md`.
- Para cada tabela: documentar ownership, operações permitidas e permissões exigidas.

**Critérios de aceite**

- Tabelas sensíveis com RLS habilitado e policies completas (SELECT/INSERT/UPDATE/DELETE conforme o caso).
- Queries do front sempre usam o recorte correto (workspace atual vs user).

### 6.2 Edge Functions: autenticação e autorização

**Risco crítico**

- Funções sem `verify_jwt=true` (ou sem validação explícita) podem ser chamadas por terceiros.

**Mitigação recomendada (regra de ouro)**

1. JWT por padrão.
2. Mesmo com JWT, validar autorização:
   - membership do workspace
   - permissões necessárias
3. Aplicar rate limiting antes de endpoints abusáveis.

**Critérios de aceite**

- Lista de funções com classificação: pública/autenticada + justificativa.
- Endpoints autenticados negam quando falta membership/permissão.

### 6.3 SSRF (webhooks)

**Estado**

- Validação server-side: HTTPS obrigatório, bloqueio de IPs privados/metadata, DNS resolve com timeout, bloqueio de portas sensíveis.

**Riscos remanescentes**

- Manutenção: arquivo grande e fácil de “quebrar” com mudanças.
- Cobertura: faltam testes focados em casos maliciosos e regressões.

**Mitigação recomendada**

- Refatorar `supabase/functions/_shared/ssrf-protection.ts` em módulos menores (ex.: `blocked-hosts.ts`, `ip-utils.ts`, `dns-check.ts`, `ports.ts`).
- Adicionar testes Deno para casos de URL maliciosa e bypass (ex.: IP integer/hex/octal, ULA IPv6, portas sensíveis).
- Logar tentativas bloqueadas com motivo e correlação.

**Critérios de aceite**

- Suite de testes que cobre pelo menos 15 vetores comuns de SSRF.
- Logs de bloqueio com motivo consistente e sem vazar dados sensíveis.

### 6.4 Uploads e Storage

**Risco**

- MIME spoofing, zip bombs, custos por abuso, exposição indevida por URLs públicas.

**Mitigação recomendada**

- Validação server-side (magic bytes + allowlist MIME + size caps) — manter como regra.
- Signed URLs com expiração (evitar `public_url` quando houver sensibilidade).
- Quotas por workspace + alertas.

**Critérios de aceite**

- Upload inválido é bloqueado no servidor com motivo claro.
- Quota impede abuso e notifica antes de estourar.

### 6.5 Auditoria

**Risco**

- Sem taxonomia padronizada, logs perdem valor investigativo.

**Mitigação recomendada**

- Definir taxonomia (action, entity_type, entity_id, metadata mínima).
- Cobrir ações críticas: webhooks, automações, privacidade, permissões/roles.

**Critérios de aceite**

- Eventos críticos sempre geram auditoria com metadados essenciais.

### 6.6 Rate limiting

**Recomendação**

- Aplicar antes de: upload, execute-webhook, simulações/execuções em massa.

---

## 7) Problemas conhecidos / itens para corrigir (não resolve agora; documenta)

### 7.1 Possível erro de build em Edge Functions (Deno + imports `npm:`)

**Sintoma**

- Falhas de build/deploy de Edge Functions relacionadas à resolução de `npm:@supabase/supabase-js@2` (ou equivalentes), variando conforme runtime/configuração.

**Risco**

- Funções deixam de implantar, ou entram em erro em runtime, impactando operações críticas (webhooks, uploads, LGPD).

**Caminhos de mitigação (recomendados para próxima iteração)**

1. Padronizar uma única estratégia de import (ex.: `npm:`) e garantir compatibilidade do runtime.
2. Incluir um “smoke test” automatizado (`supabase--test-edge-functions`) para funções críticas.
3. Documentar no repo o padrão oficial para imports em Edge Functions.

### 7.2 `supabase/config.toml` sem seções por função (`verify_jwt`)

**Observação**

- O `supabase/config.toml` no repo contém apenas `project_id`.

**Implicação**

- A política “JWT por padrão” pode ficar implícita/inconsistente (dependendo de defaults da plataforma e validações internas).

**Recomendação**

- Revisar função a função e explicitar o que é público vs autenticado (e garantir validação dentro da função quando necessário).

---

## 8) Roadmap priorizado (P0/P1/P2) + critérios + validação

### P0 — Segurança e confiabilidade imediata (1–2 sprints)

1) **Edge Functions: JWT por padrão + autorização**
- Objetivo: reduzir superfície de ataque.
- Dependências: inventário de funções + decisões de “público vs privado”.
- Risco: quebrar chamadas do front se existirem dependências de endpoints públicos.
- Critério de aceite: endpoints sensíveis exigem JWT e checam membership/permissão.
- Como validar: testes Deno + E2E Playwright para fluxos críticos.

2) **Auditoria RLS (multi-tenant) por domínio**
- Objetivo: evitar vazamento acidental entre workspaces/usuários.
- Dependências: matriz de ownership (workspace vs user).
- Critério de aceite: tabelas sensíveis com RLS e policies completas.
- Como validar: testes de acesso (usuário A não vê dados do workspace B) + revisão da matriz.

3) **SSRF hardening: testes + refatoração**
- Objetivo: reduzir risco de regressões e facilitar manutenção.
- Critério de aceite: suíte de testes SSRF + módulos menores.
- Como validar: `supabase--test-edge-functions` + logs em cenários bloqueados.

4) **Uploads: limites + quotas + signed URLs onde fizer sentido**
- Objetivo: reduzir abuso e exposição.
- Critério de aceite: validação server-side + quotas aplicadas + URLs expiráveis.
- Como validar: testes com arquivos inválidos e grandes + E2E do upload.

### P1 — Offline real + produtividade + UX (2–6 sprints)

1) **Persistência de cache por domínio (TanStack Query Persist)**
- Objetivo: leitura offline e performance percebida.
- Dependências: política por domínio (`cache-strategy.ts`).
- Critério de aceite: reabrir app offline mostra dados persistidos.
- Como validar: teste manual offline + e2e que simula offline (quando suportado).

2) **Conflitos de sync (updated_at/versão + UI mínima)**
- Objetivo: evitar perda silenciosa de dados.
- Critério de aceite: conflito detectado e comunicado.
- Como validar: cenários de update concorrente.

3) **UI Playbook + padronização de estados**
- Objetivo: consistência e velocidade de entrega.
- Critério de aceite: novas telas seguem checklist e estados padrão.
- Como validar: revisão de PR + checklist.

4) **Observabilidade por domínio (SLIs/SLOs mínimos)**
- Objetivo: detectar falhas antes do usuário.
- Critério de aceite: dashboards e alertas mínimos por módulo crítico.
- Como validar: simular falhas e observar alertas.

### P2 — Escalabilidade e operações avançadas (6+ sprints)

1) **Fila de webhooks + DLQ + reprocessamento**
- Objetivo: execução robusta e rastreável.
- Critério de aceite: retries com jitter, DLQ para falhas permanentes, UI de reprocessar.
- Como validar: cenários de falha repetida e recuperação.

2) **Relatórios agendados/exportáveis**
- Objetivo: valor para equipes e governança.
- Critério de aceite: job agendado + histórico + export (CSV/XLSX) com expiração.
- Como validar: execução agendada + download válido.

---

## 9) Apêndices

### 9.1 Arquivos e pontos de referência (repo)

- Layout do dashboard: `src/pages/dashboard/DashboardLayout.tsx`
- Persistência de cache (base): `src/lib/query-persist.ts`
- Estratégia de cache por domínio: `src/config/cache-strategy.ts`
- SSRF protection: `supabase/functions/_shared/ssrf-protection.ts`
- Validação de URL (webhook): `supabase/functions/validate-webhook-url/index.ts`
- Matriz de RLS: `docs/security/rls-matrix.md`

### 9.2 Edge Functions (mapa — indicativo)

Conforme a árvore do projeto:

- `validate-upload`
- `validate-webhook-url`
- `execute-webhook`
- `webhook-secret`, `rotate-webhook-secrets`
- `simulate-automation`, `run-scheduled-automations`
- `process-data-export`, `process-data-deletion`
- `log-audit-event`
- `admin-users`, `check-alerts`, `cleanup-expired-data`, `refresh-analytics`, etc.

### 9.3 Referências

- `docs/relatorio-tecnico-2026-02-01.md`
- `docs/relatorio-tecnico-v2-2026-02-02.md`
- `docs/security/rls-matrix.md`
