# Relatório Técnico — Projeto ZapFllow (Estado Atual, Melhorias & Segurança)
**Data:** 2026-02-01  
**Projeto:** ZapFllow — Plataforma web de automação/CRM para WhatsApp  
**Stack principal:** React 18 + Vite + TypeScript + Tailwind (tokens semânticos) + shadcn-ui/Radix + React Router + TanStack Query + Supabase (Auth + Postgres + Storage + Edge Functions) + Framer Motion.

---

## 1) Objetivo deste relatório
Este documento consolida o estado atual do projeto (frontend + backend), mapeia riscos técnicos e de segurança e propõe um roadmap de melhorias futuras voltadas a:

- **Experiência do usuário** (UX, onboarding, produtividade)
- **Confiabilidade** (resiliência, observabilidade, prevenção de falhas)
- **Performance** (listas grandes, cache, realtime)
- **Segurança e conformidade** (RLS, SSRF, uploads, LGPD)

O relatório foi produzido para servir como base de planejamento e priorização de próximas implementações.

---

## 2) Visão geral de arquitetura

### 2.1 Frontend (React/Vite)
**Pontos-chave observados no código atual:**

- **Roteamento:** `react-router-dom` com rotas públicas e rotas protegidas (`ProtectedRoute`).
- **Auth:** `src/providers/AuthProvider.tsx` centraliza sessão e identidade.
- **Dados/caching:** TanStack Query para queries/mutations e controle de cache.
- **UI:** shadcn-ui (Radix) + Tailwind com tokens semânticos (ex.: `bg-background`, `text-muted-foreground`).
- **Motion:** framer-motion, inclusive com suporte a `prefers-reduced-motion` (boa prática).
- **PWA:** service worker em `public/sw.js`, registrado em `src/main.tsx` (apenas em `import.meta.env.PROD`).

### 2.2 Backend (Supabase)
**Fundação:** Supabase Auth + Postgres + RLS + Storage + Edge Functions.

Padrões recorrentes no schema:

- Multi-tenant baseado em **`user_id`** e, em alguns casos, **`workspace_id`**.
- RLS presente em várias tabelas críticas (ex.: `messages`, `contacts`, `automations`), com funções auxiliares como `is_workspace_member(...)` e `workspace_has_permission(...)`.
- Edge Functions como camada para operações sensíveis/complexas:
  - validações (upload, webhook URL)
  - rotinas programadas
  - exportação/remoção de dados (LGPD)

---

## 3) Estrutura do repositório (alto nível)

### 3.1 Pastas relevantes
- `src/pages/*`: páginas públicas (Landing, Login, LGPD, etc.).
- `src/pages/dashboard/*`: páginas do painel autenticado.
- `src/components/*`: componentes reutilizáveis (dashboard, webhooks, media, privacidade, etc.).
- `src/hooks/*`: hooks por domínio (webhooks, contatos, media, privacy, rate limit, etc.).
- `src/types/*`: tipos TS por domínio.
- `supabase/functions/*`: Edge Functions.
- `docs/*`: relatórios e documentação interna.

### 3.2 Rotas principais observadas
Em `src/App.tsx`, há um conjunto grande de rotas do dashboard lazy-loaded, por exemplo:

- `/dashboard/inicio`
- `/dashboard/conversas`
- `/dashboard/automacoes` e editor/simulador/versões
- `/dashboard/templates`
- `/dashboard/contatos`
- `/dashboard/relatorios` e `/dashboard/analytics`
- `/dashboard/system-health`, `/dashboard/alertas`, `/dashboard/audit`
- `/dashboard/configuracoes`, `/dashboard/privacidade/*`
- `/dashboard/notificacoes`

Isso indica um produto já amplo, com foco em operações de CRM/CS + automação.

---

## 4) Módulos funcionais (estado atual)

### 4.1 Landing Page (marketing)
`src/pages/Index.tsx` possui uma landing rica (motion, shader background, seções de segmentos, pricing, depoimentos, FAQ).  
**Atenções:** arquivo longo (900+ linhas) — tende a dificultar manutenção. (Ver recomendações de refatoração).

### 4.2 Autenticação
Há páginas dedicadas:

- `src/pages/Login.tsx`
- `src/pages/Cadastro.tsx`
- `src/pages/RecuperarSenha.tsx`
- `src/pages/RedefinirSenha.tsx`

O projeto está pronto para crescimento do fluxo de identidade (MFA, SSO, etc.) via Supabase Auth.

### 4.3 Webhooks
Componentes e hooks sugerem um módulo completo:

- Gestão: `src/components/webhooks/WebhookManager.tsx`
- Formulário/wizard: `WebhookForm`, `WebhookWizard`
- Logs: `WebhookLogs`
- Resiliência: `CircuitBreakerIndicator`
- Segurança: `WebhookSecretBadge` + função de rotação

**Estado atual do empty state:** foi padronizado para um CTA primário/segundário reutilizável.

### 4.4 Mídia (Media Library)
Existem:

- Upload com validação
- Quota/analytics
- Organização por pastas/tags

O schema inclui `media_library`, `media_folders`, `media_tags`, `media_tag_assignments`.

### 4.5 Privacidade / LGPD
Conjunto relevante de páginas e componentes:

- `src/pages/PrivacyCenter.tsx`, `src/pages/Lgpd.tsx`
- Cookies: `src/components/cookies/*`
- Requests no banco: `data_export_requests`, `data_deletion_requests`

Edge Functions suportam processamento assíncrono (export e delete) (ver seção 5).

---

## 5) Edge Functions (estado atual e recomendações)

### 5.1 Lista (indicativa)
Conforme a árvore do projeto, existem funções como:

- `validate-upload` (sanitização/magic bytes)
- `validate-webhook-url` (mitigação SSRF)
- `execute-webhook`
- `webhook-secret` / `rotate-webhook-secrets`
- `simulate-automation` / `run-scheduled-automations`
- `process-data-export` / `process-data-deletion`
- `log-audit-event`
- `admin-users`, `check-alerts`, `cleanup-expired-data`, etc.

### 5.2 Autenticação (verify_jwt)
No `supabase/config.toml`, as seções `verify_jwt` para algumas funções **não estão presentes** no estado atual do repositório.

**Impacto:**
- Se uma Edge Function for exposta sem exigir JWT, ela pode ser chamada sem autenticação (dependendo de como a função valida internamente). Isso é aceitável apenas para funções explicitamente públicas e projetadas para isso.

**Recomendação:**
- Revisar, função a função, quais devem exigir JWT.
- Para endpoints que operam em dados do usuário, **requerer JWT** + validação de autorização.

> Observação: este relatório não altera comportamento — apenas recomendações.

---

## 6) Banco de dados (Supabase) — visão e padrões

### 6.1 Multi-tenant: user_id e workspaces
Há dois modelos convivendo:

- **Por usuário:** tabelas com `user_id` e políticas `auth.uid() = user_id`.
- **Por workspace:** tabelas com `workspace_id` e políticas baseadas em `is_workspace_member(...)`.

**Risco típico:** inconsistência entre domínios (uns por usuário, outros por workspace) pode causar confusão e bugs de permissão.

**Recomendação:**
- Definir claramente “o que pertence ao workspace” vs “o que pertence ao usuário” e padronizar por domínio.

### 6.2 RLS (Row Level Security)
O schema mostra RLS bem adotado em diversas tabelas (`contacts`, `messages`, `automations`, `media_library` etc.).

**Recomendação (processo contínuo):**
- Executar auditoria periódica para encontrar tabelas sem RLS/políticas.
- Garantir que **toda** tabela com dados sensíveis esteja protegida.

### 6.3 Exemplos de boas práticas já presentes
- `messages`: além de validar `auth.uid() = user_id`, também valida se o `contact_id` pertence ao usuário.
- `automations`: políticas por workspace e permissões (indício de RBAC/ABAC bem encaminhado).

---

## 7) Segurança — análise de riscos e plano de mitigação

### 7.1 SSRF (Webhooks e URLs externas)
Mesmo com validação de URL, o risco de SSRF é recorrente.

**Ações recomendadas:**
- Exigir `https://`.
- Bloquear ranges privados/loopback/metadata endpoints.
- Adotar allowlist por domínio em ambientes enterprise.
- Registrar tentativas bloqueadas em auditoria (para incident response).

### 7.2 Uploads (conteúdo malicioso e abuso de storage)
**Riscos:**
- arquivos executáveis renomeados
- zip bombs/arquivos grandes
- custo e indisponibilidade por consumo de storage

**Ações recomendadas:**
- Manter validação server-side (magic bytes + allowlist MIME).
- Limitar tamanho por arquivo e por usuário/workspace.
- Preferir buckets privados e acesso via signed URLs.
- Scan antivírus (opcional, roadmap enterprise).

### 7.3 Edge Functions expostas sem autenticação
**Risco:**
- endpoints sensíveis acessíveis sem JWT

**Ações recomendadas:**
- Reativar/definir `verify_jwt = true` por padrão, e permitir exceções apenas quando necessário.
- Garantir autorização explícita dentro da função (não depender apenas de RLS).

### 7.4 Auditoria e trilha de ações (compliance)
Há tabelas `audit_events` e `immutable_audit_log`.

**Ações recomendadas:**
- Definir taxonomia de eventos (action/entity_type/entity_id/metadata).
- Logar ações críticas:
  - criação/edição/exclusão de webhooks
  - exportação/remoção LGPD (request/complete/fail)
  - alterações de roles/permissões
  - ações administrativas

### 7.5 Rate limiting e anti-abuso
**Riscos:**
- abuso de endpoints de automação/webhook/upload
- brute force de rotas sensíveis

**Ações recomendadas:**
- Reforçar rate limit em Edge Functions e fluxos críticos.
- Criar painéis/alertas com base em `rate_limit_events`.

---

## 8) Qualidade, performance e manutenção

### 8.1 Performance (listas e dashboards)
O projeto já usa virtualização e React Query.

**Recomendações:**
- Padronizar paginação/virtualização em todas listas grandes.
- Evitar `select('*')` em tabelas com payload grande; selecionar colunas necessárias.
- Observar limite default do Supabase (1000 rows) e aplicar paginação.

### 8.2 Degradação controlada
- Componentes de empty state e error state já existem: reforçar consistência em todo dashboard.
- Padronizar “retry”, mensagens e CTAs (ex.: “Conectar WhatsApp”, “Criar automação”).

### 8.3 Manutenibilidade
`src/pages/Index.tsx` é muito grande.

**Recomendação:**
- Extrair seções em componentes (`Hero`, `Segments`, `Pricing`, `FAQ`, etc.) para reduzir acoplamento.
- Isso melhora testes, performance de build e trabalho em equipe.

---

## 9) Roadmap sugerido (priorizado)

### P0 — Segurança e confiabilidade (curto prazo)
1. **Revisão de `verify_jwt`** e autenticação de Edge Functions.
2. **Auditoria RLS**: identificar tabelas sem RLS e políticas ausentes.
3. **Reforçar SSRF protection** (logs/auditoria + allowlist opcional).
4. **Uploads**: endurecer allowlist MIME, limites e políticas de storage.
5. **Auditoria de eventos** (padronização e cobertura de ações críticas).

### P1 — UX (médio prazo)
1. **Notificações in-app em tempo real** (inbox + preferências) — já existe um plano detalhado em `.lovable/plan.md`.
2. **Empty states com CTAs claros** em todos os módulos (padronização global, já iniciado).
3. **Onboarding orientado por resultados** (checklist + tours com metas “Conectar WhatsApp”, “Criar primeira automação”, “Importar contatos”).

### P1 — LGPD e privacidade (médio prazo)
1. Central de Privacidade: acompanhar export e deleção ponta a ponta.
2. Retenção/limpeza automática de exports (cron/edge agendada).
3. Expandir export para incluir mais domínios (contatos, mensagens, webhooks/logs, mídia metadados).

### P2 — Escala e integrações (longo prazo)
1. Execução robusta de webhooks (retry com backoff + jitter + filas).
2. Relatórios agendados e exportáveis (CSV/XLSX/PDF).
3. Integrações externas (Drive, BI, CRM) com gestão segura de tokens.

---

## 10) Próximas ações recomendadas (práticas)
Para transformar este relatório em backlog executável, recomenda-se:

1. **Rodar um security scan** (RLS + exposição de dados) e revisar findings.
2. Criar um **documento de padrões** (convenções de hooks, queries, policies, edge auth).
3. Montar uma **matriz de permissões** (por workspace/role) para cada domínio.
4. Definir um **SLO mínimo** (ex.: webhooks: taxa de sucesso, tempo de execução, retriable failures).

---

## 11) Referências internas
- Plano de notificações (escopo e arquitetura): `.lovable/plan.md`
- Relatório anterior (base de comparação): `docs/relatorio-tecnico-2026-01-30.md`
