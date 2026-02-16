# Relatório Técnico — Implementações Futuras, UX e Segurança
**Data:** 2026-01-28  
**Projeto:** App React (Vite + TS) com Supabase (auth + database)  
**Stack principal:** React 18, Vite, TypeScript, Tailwind (tokens semânticos), shadcn-ui, React Router, TanStack Query, Supabase JS v2, Framer Motion.

---

## 1) Visão geral da arquitetura atual

### 1.1 Frontend
- **Rotas públicas**: `/`, `/sobre`, `/termos-de-uso`, `/politica-de-privacidade`, `/politica-de-cookies`, `/lgpd`, `/contato`, `/seguranca`, `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`.
- **Rotas protegidas**: `/dashboard/*` via `ProtectedRoute`.
- **Providers globais**:
  - `AuthProvider` (estado de sessão/usuário via `supabase.auth.onAuthStateChange` + `getSession`)
  - `QueryClientProvider` (cache + fetching)
  - `AppErrorBoundary` (tratamento de erros em runtime)
  - `CookieConsentGate` (LGPD/cookies)
  - UI: Toaster + Sonner, TooltipProvider, CustomCursor.

**Ponto positivo:** boa separação de páginas e uso de lazy-loading no dashboard.  
**Risco/atenção:** garantir que componentes críticos de auth e guarda de rotas lidem bem com `loading=true` para evitar “flash” de conteúdo protegido.

### 1.2 Supabase / Banco
Tabelas observadas (public schema):
- `automations`, `automation_versions`, `automation_variables`
- `cookie_preferences`
- `trial_access`
- `user_roles`
Enums/funções:
- enum `app_role` e função `has_role(...)`

**RLS:** habilitado nas tabelas listadas, com políticas focadas em `auth.uid() = user_id`.

---

## 2) Estado atual de segurança (o que já está bem encaminhado)

### 2.1 Multi-tenant e proteção de dados
- Políticas RLS existentes limitam acesso por usuário (`auth.uid() = user_id`).
- `user_roles` separado (evita **privilege escalation** por manipulação de perfis).

### 2.2 Boas práticas já incorporadas
- Uso de `AppErrorBoundary` + componentes de erro.
- Estrutura de cookies (gate + preferências) adequada para LGPD.

---

## 3) Lacunas e riscos (prioridade alta)

### 3.1 Validação de entrada (client e server)
**Risco:** injeção, dados inválidos, URLs externas perigosas e corrupção de dados.  
**Recomendação:**
- Padronizar validação com **Zod** em todos os formulários.
- Nunca enviar input do usuário direto para URLs externas sem `encodeURIComponent`.
- Não renderizar HTML de usuário (evitar `dangerouslySetInnerHTML`).

### 3.2 Autorização baseada em papéis (RBAC) sem confiar no cliente
**Risco crítico:** checar “admin” via localStorage/hardcode/flags no cliente.  
**Recomendação:**
- Validar permissões no **Supabase (RLS + função `has_role`)** e/ou **Edge Functions**.
- No frontend, papéis apenas para UI/UX; **decisão final sempre no servidor**.

### 3.3 Logs e observabilidade
**Risco:** falhas silenciosas e difícil auditoria de ações sensíveis.  
**Recomendação:** adicionar auditoria/logs para:
- mudanças de plano/assinatura
- exportação de dados
- alterações em automações (publicar/pausar/ativar)
- convites de time

---

## 4) Melhorias para usuários (UX/Produto) — roadmap recomendado

### 4.1 Onboarding e ativação (curto prazo)
- Onboarding guiado: conectar WhatsApp → importar contatos → criar primeira automação.
- Checklist de ativação no dashboard.
- Tooltips contextuais e Empty States prescritivos.

### 4.2 Experiência em automações (médio prazo)
- UX de versionamento/rollback (aproveitar `automation_versions`).
- Validação do fluxo antes de ativar:
  - blocos órfãos
  - jumps inválidos
  - variáveis referenciadas (`{{var}}`)

### 4.3 Contatos e conversas (médio prazo)
- Busca + filtros avançados em contatos (tags, status, origem).
- Ações em lote (tags, incluir em automação, exportar).
- Padronizar virtualização para listas grandes.

### 4.4 LGPD/Privacidade (contínuo)
- Central de privacidade (download de dados, exclusão/anonimização, histórico de consentimento).
- Registro de consentimento por versão de política.

---

## 5) Segurança e compliance — recomendações técnicas detalhadas

### 5.1 RLS: checklist por tabela
Para cada tabela com `user_id`, garantir:
- `SELECT`: `USING (auth.uid() = user_id)`
- `INSERT`: `WITH CHECK (auth.uid() = user_id)`
- `UPDATE`: `USING` e `WITH CHECK`
- `DELETE`: `USING`

**Atenção:**
- `automation_versions`: sem UPDATE (ok se for imutável; documentar como “append-only”).
- `trial_access`: sem UPDATE/DELETE (ok se controlado por backend; renovações via função/edge).

### 5.2 Princípio do menor privilégio
- Nunca usar service role no frontend.
- Segredos somente via Secrets/ambiente seguro.

### 5.3 Proteções contra abuso
- Rate limit em endpoints sensíveis (recuperação de senha, criação de conta, convites, webhooks).
- Mitigar enumeração de usuários por email.

### 5.4 Segurança do editor de automações
- Validar e limitar o `doc` (jsonb) antes de salvar.
- Limites:
  - nº máximo de blocos
  - tamanho de texto por bloco
  - nº de botões/itens
- Validar URLs de webhook (mínimo: `https://`; ideal: allowlist por workspace).

### 5.5 Auditoria e trilha de mudanças
Recomenda-se tabela `audit_events` com:
- `id`, `created_at`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`
e RLS para o próprio usuário/tenant + políticas para admins.

---

## 6) Qualidade, manutenção e performance

### 6.1 Padrões de código e organização
- Consolidar validação e form-handling.
- Padronizar mensagens de erro/toasts.

### 6.2 Performance
- Prefetch do React Query em transições previsíveis.
- Virtualização para listas grandes.

### 6.3 Testes
- Unit tests para schemas Zod e validação do fluxo de automações.
- Integração: login → dashboard; criar/editar/ativar automação; importar contatos.

---

## 7) Backlog priorizado (recomendação)

### P0 (Segurança/Estabilidade)
1. Padronizar validação com Zod em formulários críticos.
2. Revisar `ProtectedRoute` + estados de loading para evitar leaks/flash.
3. Auditar RLS vs. comportamentos esperados.

### P1 (Produto/UX)
1. Checklist de onboarding + empty states guiados.
2. Versionamento/rollback de automações.
3. Busca/filtros e ações em lote em contatos.

### P2 (Escala/Observabilidade)
1. Auditoria de eventos + logs estruturados.
2. Rate limiting e proteções anti-abuso.
3. Métricas de funil (cadastro → ativação → automação ativa).

---

## 8) Apêndice — Definição de pronto (DoD) para features futuras

Uma feature só é considerada pronta quando:
- ✅ UI responsiva + estados de loading/erro
- ✅ Validação client-side (Zod) + limites de tamanho
- ✅ Proteção server-side (RLS/Edge)
- ✅ Logs/auditoria para ações sensíveis
- ✅ Teste end-to-end do fluxo principal
