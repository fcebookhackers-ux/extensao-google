# Relatório Técnico — Estado Atual, Riscos e Roadmap de Evolução
**Data:** 2026-01-30  
**Projeto:** Aplicação web (React + Vite + TypeScript) com Supabase (Auth + Database + Storage + Edge Functions)  
**Stack principal:** React 18, Vite, TypeScript, Tailwind (tokens semânticos), shadcn-ui, React Router, TanStack Query, Supabase JS v2, Framer Motion.

---

## 1) Objetivo deste relatório
Consolidar o estado atual do projeto (frontend + backend), mapear riscos técnicos/segurança e listar um roadmap de implementações futuras priorizadas para evoluir produto, confiabilidade e conformidade (LGPD).

---

## 2) Visão geral da arquitetura

### 2.1 Frontend
- **Framework:** React + Vite + TypeScript.
- **Estilo/UI:** Tailwind com tokens semânticos + shadcn-ui (Radix UI).
- **Roteamento:** React Router.
- **Dados e cache:** TanStack Query.
- **Motion:** framer-motion (animações e transições).

**Organização por domínios (exemplos):**
- Auth: `src/pages/Login.tsx`, `src/pages/Cadastro.tsx`, `src/providers/AuthProvider.tsx`.
- Dashboard: `src/pages/dashboard/*` e componentes em `src/components/dashboard/*`.
- Webhooks: `src/components/webhooks/*` e tipos em `src/types/webhooks.ts`.
- Mídia: `src/components/media/*`, hooks `src/hooks/useMedia*`.
- Privacidade/LGPD: páginas públicas + componentes de cookies + tipos `src/types/privacy.ts`.

### 2.2 Backend (Supabase)
- **Auth:** Supabase Auth.
- **Database:** PostgreSQL com RLS habilitado (multi-tenant por `user_id`).
- **Storage:** buckets para mídia e exports.
- **Edge Functions:** execução de rotinas e validações (ex.: validação upload, validação de URL de webhook, processamento de exportações).

**Padrões importantes já observados:**
- Tabelas orientadas a `user_id`.
- RLS como primeira linha de defesa.
- Funções/Edge para operações sensíveis (evitar service role no client).

---

## 3) Funcionalidades relevantes já presentes

### 3.1 Webhooks
- Cadastro/edição de webhooks (URL, eventos, headers, secret, retry config).
- Logs de execução em `webhook_logs`.
- Indicadores de circuit breaker e dashboards/analytics.

### 3.2 Media Library
- Upload (drag-and-drop), listagem, filtros e ações (copiar URL, abrir, excluir).
- Registro em `media_library` + suporte a buckets e miniaturas.
- Analytics de mídia (quota, tendências, distribuição por tipo).

### 3.3 Segurança / Qualidade
- Componentes de guarda e permissões (ex.: `ProtectedRoute`, `PermissionGuard`).
- Estrutura de cookies e preferências (LGPD) com UI dedicada.
- Utilities de rate limit (tabelas + hooks/indicadores).
- Error boundary e estados de erro.

### 3.4 Privacidade (LGPD)
- Tipos e suporte a solicitações de exportação/remoção de dados em `src/types/privacy.ts`.
- Edge Function existente para processamento de exportação em background:
  - `supabase/functions/process-data-export/index.ts` (gera JSON, grava no bucket `exports` e atualiza `data_export_requests`).

---

## 4) Edge Functions e responsabilidades atuais

### 4.1 `process-data-export`
**Responsabilidade:**
- Recebe `requestId` autenticado.
- Busca a solicitação em `data_export_requests`.
- Coleta dados do usuário (ex.: `automations`, `consent_history`).
- Gera arquivo JSON e grava em `Storage (exports)`.
- Gera signed URL (7 dias) e atualiza `data_export_requests`.

**Pontos positivos:**
- Não armazena binário no banco.
- Usa service role apenas no backend.

**Atenções:**
- Garantir políticas corretas no bucket `exports`.
- Tratar expiração/limpeza de exports antigos.
- Expandir escopo de dados exportados (ver Roadmap).

---

## 5) Segurança e compliance — riscos e recomendações

### 5.1 RLS e multi-tenant
**Risco:** vazamento de dados se uma tabela não tiver RLS/políticas adequadas.

**Recomendação (checklist):**
- Para cada tabela com `user_id`:
  - `SELECT`: `USING (auth.uid() = user_id)`
  - `INSERT`: `WITH CHECK (auth.uid() = user_id)`
  - `UPDATE`: `USING` + `WITH CHECK`
  - `DELETE`: `USING`

### 5.2 SSRF e URLs externas (webhooks)
**Risco:** SSRF e exfiltração via webhooks/URLs arbitrárias.

**Recomendação:**
- Backend enforcing: aceitar apenas `https://`.
- Validar e bloquear destinos privados/loopback.
- Usar allowlist por domínio (ideal em ambientes enterprise).

### 5.3 Upload de arquivos
**Risco:** upload de arquivos maliciosos renomeados e abuso de storage.

**Recomendação:**
- Validação server-side (magic bytes + MIME allowlist).
- Limites por usuário (tamanho total e número de arquivos).
- Preferir buckets privados + signed URLs curtas para leitura.

### 5.4 Auditoria de ações sensíveis
**Risco:** dificuldade de rastrear ações críticas (LGPD, webhooks, billing, time).

**Recomendação:**
- Consolidar eventos em `audit_events` (já existe tabela no schema).
- Padronizar `action`, `entity_type`, `entity_id`, `metadata`.
- Registrar eventos para:
  - exportação de dados (request/completed/failed)
  - criação/edição/exclusão de webhooks
  - alterações em automações (publicar/pausar)
  - convites e mudanças de papéis

### 5.5 Rate limiting e anti-abuso
**Risco:** abuso de endpoints (convites, reset de senha, triggers de webhook, uploads).

**Recomendação:**
- Aplicar rate limit em Edge Functions críticas.
- Registrar `rate_limit_events` com metadados úteis para diagnósticos.

---

## 6) Performance e escalabilidade

### 6.1 Listas grandes
- Manter virtualização consistente (`@tanstack/react-virtual`) em:
  - contatos
  - conversas
  - logs (webhooks)
  - listagens de mídia

### 6.2 Realtime e assinaturas
- Ao usar Realtime, garantir:
  - cleanup correto de channels no `useEffect`.
  - invalidation controlado do React Query para evitar storms.

### 6.3 Observabilidade
- Padronizar logging em Edge Functions (correlation id / request id).
- Criar painel “Saúde do sistema” (webhooks, storage, falhas de upload, filas).

---

## 7) Roadmap de implementações futuras (priorizado)

### P0 — Segurança e confiabilidade (curto prazo)
1. **Enforcement de HTTPS + SSRF protection** no backend para webhooks.
2. **Validação server-side de uploads** (magic bytes + MIME allowlist) e limites por usuário.
3. **Integração de rate limit** nos pontos sensíveis (Edge + ações do dashboard).
4. **Revisão sistemática de RLS** (todas as tabelas com dados do usuário).
5. **Auditoria**: padronizar eventos em `audit_events` para ações críticas.

### P1 — LGPD e privacidade (médio prazo)
1. **Central de Privacidade** (UX completa):
   - solicitar exportação
   - acompanhar status
   - baixar arquivo assinado
   - solicitar exclusão/anonimização
2. **Ampliar exportação de dados** para cobrir:
   - contatos
   - mensagens
   - webhooks + logs
   - mídia (apenas metadados + caminhos; arquivo via signed URLs quando aplicável)
3. **Política de retenção** para exports (expirar + cleanup agendado).

### P1 — Produto/UX (médio prazo)
1. **Notificações in-app em tempo real** (inbox + preferências) conforme plano em `.lovable/plan.md`.
2. **Melhorias nos logs de webhooks** (filtros avançados, “reenviar evento”, destaque de falhas recorrentes).
3. **Integração da Media Library** com o editor de automações (seleção de mídia em blocos).

### P2 — Escala e integrações (longo prazo)
1. **Sync de exports com Google Drive** (OAuth 2.0 + Drive API):
   - armazenar tokens com segurança (vault/segredos)
   - job de sync assíncrono
   - UI de status e histórico de sync
2. **Fila/execução robusta de webhooks** (retry com backoff + jitter; filas dedicadas).
3. **Relatórios agendados** (export recorrente + envio).

---

## 8) Recomendação específica: Relatórios “Exportar Relatório” (UI)
Existe um diálogo mock em `src/pages/dashboard/relatorios/components/ExportReportDialog.tsx`.

**Evolução sugerida (quando entrar no escopo):**
- Substituir “mock” por criação de job no backend:
  - salvar request (tabela de jobs)
  - processar em Edge Function
  - gerar arquivo (PDF/XLSX/CSV)
  - disponibilizar download via signed URL

---

## 9) Definição de pronto (DoD) recomendada
Uma feature só é considerada pronta quando:
- ✅ UI responsiva + estados de loading/erro
- ✅ validação client-side + limites de tamanho
- ✅ proteção server-side (RLS/Edge)
- ✅ logs/auditoria para ações sensíveis
- ✅ teste do fluxo principal (manual ou automatizado)

---

## 10) Próximos passos sugeridos (decisão de produto)
1. Priorizar **P0 (segurança/robustez)** antes de expandir integrações externas.
2. Implementar **Notificações in-app** (plano já definido) para elevar observabilidade e UX.
3. Em seguida, finalizar **Central de Privacidade** e expandir **exportação**.
