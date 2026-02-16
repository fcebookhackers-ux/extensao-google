# Relatório técnico do projeto — 2026-02-04

Este documento descreve o estado atual do projeto, arquitetura, integrações, decisões recentes e recomendações para futuras implementações.

> Data: **2026-02-04**

---

## 1) Stack e estrutura geral

### Frontend
- **React 18 + Vite + TypeScript**
- **Tailwind CSS** + componentes **shadcn/ui** (Radix UI)
- **TanStack React Query** para cache/estado de dados e mutações
- Roteamento com **react-router-dom**

### Backend
- **Supabase** (projeto ref: `qvcanphpifzocejtqdip`)
- Edge Functions em **Deno**
- Banco PostgreSQL com **RLS** (Row Level Security) habilitado em tabelas sensíveis

### Organização (alto nível)
- `src/hooks/*`: hooks de dados/estado (React Query, auth, permissões)
- `src/pages/dashboard/*`: páginas do dashboard
- `supabase/functions/*`: Edge Functions (integrações externas e lógica server-side)
- `docs/*`: documentação funcional e técnica

---

## 2) Autenticação e sessão

### Auth
- O frontend usa `@supabase/supabase-js` via `src/integrations/supabase/client.ts`.
- Sessão persistida no navegador (`persistSession: true`).

### Observações práticas
- Edge Functions que precisam autenticação **não** devem depender de verificação automática de JWT na borda (config). O padrão adotado é:
  - `verify_jwt = false` no `supabase/config.toml` (quando aplicável)
  - validação manual no código da função via `supabase.auth.getUser(token)`

---

## 3) Modelo de Workspaces e RBAC (controle de acesso)

### Conceito
- A aplicação usa **Workspaces** para multi-tenancy.
- A associação usuário↔workspace fica em `public.workspace_members`.
- O RBAC é baseado em:
  - enum `public.permission_type`
  - tabela `public.role_permissions` (mapeia *role → permissões*)
  - funções SQL:
    - `public.workspace_has_permission(p_workspace_id uuid, p_permission text, p_user_id uuid) returns boolean`
    - `public.workspace_user_role(p_workspace_id uuid, p_user_id uuid) returns text`

### Padrões no código
- Frontend usa permissões para gating de UI e features (ex.: `whatsapp.manage`).
- Edge Functions validam permissões server-side (ex.: `requirePermission`).

### Regras importantes (segurança)
- **Não armazenar privilégios em localStorage**.
- **Não inferir admin no client** sem validação server-side.

---

## 4) Integração WhatsApp (Evolution API)

### Objetivo
Conectar e gerenciar WhatsApp via **Evolution API** (Baileys), com:
- criação de instância
- leitura de QR Code
- webhooks para mensagens e eventos
- envio de mensagens
- desconexão/remoção

### Secrets necessários (Edge Functions)
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `SERVICE_ROLE_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`)

### Edge Functions relacionadas

#### 4.1) `evolution-create-instance`
- Responsável por criar instância na Evolution.
- Registra em `public.whatsapp_instances`.
- Configura webhook para `.../functions/v1/evolution-webhook`.
- **Comportamento atual importante:**
  - Se já existe instância para o workspace, **retorna a existente** e **não recria automaticamente**.
  - Para gerar novo QR, o fluxo recomendado é desconectar/remover e criar novamente.
- Autorização:
  - `requireAuth` valida token
  - `requirePermission(userId, workspaceId, 'whatsapp.manage')`

#### 4.2) `evolution-webhook`
- Recebe eventos externos da Evolution e persiste no banco (conversas/mensagens).
- Endpoint público (normalmente `verify_jwt = false`) com validações de entrada.

#### 4.3) `evolution-send-message`
- Envia mensagens via Evolution.
- Normalmente exige instância conectada.

#### 4.4) `evolution-disconnect-instance`
- Desconecta/remove instância e limpa estado no banco.

### Frontend: hooks e telas

#### Hook `useWhatsAppInstance`
- Query em `whatsapp_instances` por `workspace_id`.
- Mutations:
  - `createInstance` (invoke `evolution-create-instance`)
  - `disconnectInstance` (invoke `evolution-disconnect-instance`)
  - `resetInstance` (disconnect + create)
- Lida com polling por status.

#### Telas
- `src/pages/dashboard/WhatsAppConnect.tsx`
  - Fluxo de conectar/exibir QR/exibir conectado.
  - Ajuste recente: modo **instância global** (ver seção 5).
- `src/pages/dashboard/WhatsAppConversations.tsx`
  - Lista de conversas e chat.
  - Ajuste recente: modo **instância global**.

---

## 5) Decisão recente: “instância global”

### Problema observado
Usuários diferentes estavam em **workspaces diferentes**, e a criação/conexão gerava 403 para quem não era membro do workspace selecionado.

### Decisão do produto
Modelo escolhido:
- **Instância global**
- Usuários entram automaticamente no **workspace principal**
- UI do WhatsApp deve **forçar workspace principal** e **apenas admin conecta**

### Implementações feitas

#### 5.1) Forçar workspace principal no frontend
- `WhatsAppConnect.tsx` e `WhatsAppConversations.tsx` passaram a usar:
  - `PRIMARY_WORKSPACE_ID = 'e3946d71-98ec-4c08-9adb-9b6ed0e28e2d'`

#### 5.2) Auto-membership (novos usuários)
Foi criada uma função/trigger:
- `public.ensure_primary_workspace_membership()`
- Trigger `AFTER INSERT` em `public.profiles` para inserir em `public.workspace_members`.

**Importante:** isso só funciona quando o usuário tem registro em `public.profiles`.

#### 5.3) Backfill / correção para usuários já existentes
Foi necessário criar `public.profiles` para usuários que existiam em `auth.users` mas não em `public.profiles`, e então inserir membership no workspace principal.

#### 5.4) Permissões
- `whatsapp.manage` está concedida a `admin` e `moderator` em `role_permissions`.
- Usuários comuns (`user`) **não** têm `whatsapp.manage`.

#### 5.5) UX: impedir 403 no botão
- Em `WhatsAppConnect.tsx`, foi adicionado um check via `supabase.rpc('workspace_has_permission', ...)`.
- Se `canManage === false`, o botão “Conectar WhatsApp” fica desabilitado e a UI explica que a conexão é administrada.

---

## 6) Pontos de atenção (bugs/risco/observabilidade)

### 6.1) 403 “Forbidden” em produção vs preview
- Se o site em produção ainda permite clicar e retorna 403, isso normalmente indica **código não publicado**.
- Verificar sempre se o usuário está usando o **Preview** ou o domínio publicado.

### 6.2) Logs de Edge Functions com erro de microtasks
Foi observado em logs (outras funções):
`Deno.core.runMicrotasks() is not supported in this environment`

Isso costuma indicar **polyfills Node** ou libs que assumem Node APIs no runtime edge.

Recomendação:
- Evitar imports/transitivos que puxem `std/node/*` para Edge Functions.
- Revisar instrumentação (OpenTelemetry/Sentry) se estiver aplicada dentro das functions.

### 6.3) Linter: Leaked Password Protection
- O linter do Supabase acusou “Leaked password protection disabled”.
- Em plano Free, isso pode ser indisponível.

---

## 7) Recomendações para próximas implementações

### 7.1) Padronizar “workspace principal”
Hoje o `PRIMARY_WORKSPACE_ID` está hardcoded no frontend.

Evolução recomendada (quando fizer sentido):
- Guardar em config no banco (`app_settings` por exemplo) e buscar via RPC/Query.
- Ou carregar do backend via Edge Function (evita rebuild para trocar o workspace principal).

### 7.2) Provisionamento consistente de `public.profiles`
Para evitar usuários sem profile:
- Criar trigger/func para inserir profile automaticamente na criação de usuário (padrão comum no Supabase).
- Alternativa: garantir no fluxo de signup do frontend.

### 7.3) Permissões e UX
- Sempre que uma ação depende de permissão, preferir:
  - mostrar UI explicativa
  - bloquear o CTA
  - logar no console o motivo (para debug)

### 7.4) Segurança
- Confirmar RLS em tabelas com PII (ex.: contatos, mensagens, etc.).
- Evitar SELECT público em dados sensíveis.

---

## 8) Referências internas

- Guia WhatsApp: `docs/whatsapp-integration.md`
- Edge Function auth helpers: `supabase/functions/_shared/auth-helpers.ts`
- Hook de instância: `src/hooks/useWhatsAppInstance.ts`
- Hooks de workspace:
  - `src/hooks/useCurrentWorkspace.ts`
  - `src/hooks/useUserWorkspaces.ts`
