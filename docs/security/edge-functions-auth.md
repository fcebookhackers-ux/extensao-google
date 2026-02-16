# Autenticação em Edge Functions (ZapFllow)

Data: 2026-02-03

## Regra de ouro
Como o projeto usa **Supabase signing-keys**, **não** utilizamos `verify_jwt=true` no `supabase/config.toml`.

Em vez disso:

- `verify_jwt = false` no `supabase/config.toml`
- validação **obrigatória** no código via `supabase.auth.getClaims(token)`

Motivo: `verify_jwt=true` é um fluxo legado que pode falhar com signing-keys.

## Helper padrão
Use `supabase/functions/_shared/auth-helpers.ts`.

### requireAuth(req)
- Exige `Authorization: Bearer <jwt>`
- Valida via `getClaims(token)`
- Retorna `{ userId, email?, authHeader }`

### requireWorkspaceMembership(userId, workspaceId)
- Valida membership via `workspace_members` usando **SERVICE_ROLE_KEY**
- Retorna `403` se não for membro

### requirePermission(userId, workspaceId, permission)
- Valida permissão via RPC `workspace_has_permission(...)` (quando disponível)
- Retorna `403` se negado

## Exceções permitidas (sem JWT de usuário)

### Cron jobs / jobs internos
Endpoints chamados por `pg_cron`/`pg_net` **não** devem exigir JWT de usuário.
Padrão:
- `verify_jwt=false`
- autenticação por secret interno **no header** (ex.: `x-refresh-analytics-secret`) **ou** Bearer com uma chave interna controlada

### Webhooks recebidos (entrantes)
Endpoints públicos (ex.: Stripe/GitHub) devem:
- **não** exigir JWT
- **exigir** assinatura/secret + validação de input

## Checklist por função
- [ ] `verify_jwt=false` definido em `supabase/config.toml`
- [ ] `requireAuth()` no início (quando endpoint é usuário->API)
- [ ] `requireWorkspaceMembership()` ao acessar recursos por `workspace_id`
- [ ] `requirePermission()` para ações sensíveis
- [ ] logs com contexto mínimo (userId, workspaceId, entityId)
- [ ] testes cobrindo 401 (sem token) e 401 (token inválido)

## Testes
Arquivo: `supabase/functions/_tests/auth.test.ts`

Executar via pipeline de testes de Edge Functions (Deno). Os testes fazem chamadas HTTP para a URL do projeto (lida do `.env`).
