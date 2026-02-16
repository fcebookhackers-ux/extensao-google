
## Objetivo
Gerar e salvar um **relatório técnico completo** (Markdown) em `docs/` com a **data de hoje (2026-02-03)**, cobrindo: melhorias **visuais (UI/UX)**, **operacionais (performance, observabilidade, confiabilidade, offline)** e **segurança (RLS, Edge Functions, SSRF, uploads, LGPD)** — com foco em servir como base para futuras implementações.

## Arquivo a ser criado
- `docs/relatorio-tecnico-2026-02-03.md`

Padrão de nome e cabeçalho seguirá os relatórios existentes:
- `docs/relatorio-tecnico-2026-02-01.md`
- `docs/relatorio-tecnico-v2-2026-02-02.md`

## Estrutura proposta do relatório (MD)

### 1) Capa + Sumário executivo
- Título: “Relatório Técnico — Projeto ZapFllow (Arquitetura, Melhorias Visuais/Operacionais & Segurança)”
- Data, projeto, stack atual.
- 8–12 bullets de “Principais conclusões” (riscos/quick wins).

### 2) Visão de arquitetura (atual)
**Frontend**
- Rotas públicas vs dashboard, layout (`DashboardLayout`), onboarding/tours, Command Palette.
- Padrões de UI: shadcn/radix + Tailwind tokens semânticos.
- PWA/SW: registro somente PROD (com `sw-advanced.js`).

**Backend (Supabase)**
- Auth + Postgres + RLS + Storage + Edge Functions.
- Multi-tenant: `workspace_id` + permissões vs `user_id` “fallback” (referenciar `docs/security/rls-matrix.md`).

### 3) Estado atual por módulos (com “o que funciona” + “gaps”)
- Onboarding/Help
- Contatos (virtualização, filtros, bulk actions)
- Automações (editor, versões, simulação)
- Webhooks (wizard, secrets/rotação, logs, circuit breaker)
- Mídia (upload, library, quota/analytics)
- Privacidade/LGPD (export/deletion requests, histórico)
- Notificações e System Health

Cada módulo terá:
- “Estado atual”
- “Melhorias sugeridas”
- “Critérios de aceite” (curtos e objetivos)

### 4) Melhorias visuais (UI/UX) — guia operacional
Checklist prático para futuras telas:
- Consistência de tokens semânticos (sem cores hardcoded)
- Estados padrão: loading / empty / error / offline / sem permissão
- Acessibilidade: foco, labels, aria, contraste, teclado
- Mobile: layout responsivo no dashboard (sidebar, sheets)
- Padrões de microinterações (framer-motion com `prefers-reduced-motion`)
- Padronização de CTAs e copy (Português consistente)

Entregáveis sugeridos:
- “UI Playbook” (seções reutilizáveis, padrão de cards/tabelas/dialogs)
- Inventário de componentes críticos e onde aplicar

### 5) Melhorias operacionais (performance, confiabilidade, offline, DX)
- Performance:
  - reduzir `select('*')`, limitar colunas, paginação (limite 1000 rows do Supabase)
  - virtualização como padrão em listas grandes
  - prefetch responsável (onde vale a pena)
- Cache/Resiliência:
  - política de cache por domínio (staleTime, retries, refetchOnFocus)
  - persistência do TanStack Query (conectar com a intenção existente em `.lovable/plan.md`)
- Offline v2 → “offline completo”:
  - conflitos (`updated_at`/versão), estratégias de merge e UI
  - persistência de cache por domínio
  - uploads offline (IndexedDB) como fase avançada
- Observabilidade:
  - Sentry + OpenTelemetry: quais eventos/medidas instrumentar (webhooks, uploads, automations)
  - SLIs/SLOs mínimos por domínio
- Testes:
  - reforço do Playwright (fluxos críticos + smoke + performance)
  - recomendação de cenários end-to-end por módulo

### 6) Segurança (prioridade alta) — riscos e mitigação
Seções claras com risco → impacto → mitigação → critérios de aceite:
- RLS / multi-tenant (workspaces vs user-owned)
- Edge Functions:
  - regra “JWT por padrão” (`verify_jwt=true`) e exceções públicas bem justificadas
  - autorização adicional: membership + permissões
- SSRF (webhooks):
  - exigir HTTPS, bloquear ranges privados/metadata endpoints, logs/auditoria
- Uploads:
  - validação server-side (magic bytes), limites por workspace, quotas, signed URLs
- Auditoria:
  - taxonomia de eventos e cobertura (webhooks, automations, privacidade, roles/permissões)
- Rate limiting:
  - aplicar antes de upload/webhook/execuções massivas
- LGPD:
  - trilha de status request → processing → completed/failed, retenção e limpeza

### 7) “Problemas conhecidos / itens para corrigir” (para orientar próximas ações)
Incluir uma seção explícita com pontos detectados recentemente, por exemplo:
- Build erro atual em Edge Functions relacionado a resolução do `@supabase/supabase-js` via `npm:` no ambiente Deno (descrição do sintoma e caminhos de correção).
- Observação sobre `supabase/config.toml`: remoção das seções `[functions.*].verify_jwt` (implicações e recomendação de revisão por função).

(Observação: essa seção não resolve agora; documenta para futuras implementações.)

### 8) Roadmap priorizado (P0/P1/P2) + estimativa relativa
- P0: segurança e confiabilidade imediata (Edge auth, RLS audit, SSRF, uploads)
- P1: offline real + produtividade (persistência de cache, conflitos, command palette “recentes”)
- P1: UX padronizada (empty/error/offline/no-permission states)
- P2: escalabilidade (fila de webhooks, DLQ, relatórios agendados/exportáveis)

Para cada item:
- objetivo
- dependências
- risco
- critério de aceite
- “como validar” (teste manual + E2E recomendado)

### 9) Apêndices
- Links internos do repo (arquivos-chave)
- Lista de Edge Functions (mapa e responsabilidade)
- Referências: relatórios anteriores e `docs/security/rls-matrix.md`

## Como vou garantir que o relatório fique “completo”
- Reutilizar o que já está excelente no `relatorio-tecnico-v2-2026-02-02.md`, mas:
  - adicionar uma seção dedicada a **melhorias visuais** (playbook/checklists)
  - adicionar “problemas conhecidos” (incluindo o build erro atual)
  - transformar recomendações em backlog com critérios de aceite e validação
- Manter tom operacional, com bullets e critérios claros, evitando texto excessivamente abstrato.

## Entrega (o que acontecerá quando você aprovar)
- Criarei o arquivo `docs/relatorio-tecnico-2026-02-03.md` já pronto, bem formatado, com headings consistentes, listas e checklists acionáveis.
- O documento ficará imediatamente navegável no repositório na pasta `docs/`.
