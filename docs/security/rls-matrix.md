# Matriz de RLS (Workspaces) — Zapfllow

Este documento resume como o acesso é controlado via **RLS** usando:

- `is_workspace_member(workspace_id, auth.uid())`
- `has_permission(permission, workspace_id)`

## Conceitos

- **Workspace-bound**: registros com `workspace_id IS NOT NULL` exigem membership + permissão.
- **User-bound (fallback)**: para algumas tabelas, quando `workspace_id IS NULL`, o acesso cai para `user_id = auth.uid()`.
- **Permissões normalizadas**: permissões são avaliadas no formato `dominio.acao` (ex.: `contacts.view`).

## Tabelas cobertas (padrão workspace)

| Domínio | Tabelas | Observação |
|---|---|---|
| Contacts | `public.contacts` | Somente via workspace + permissão |
| Automations | `public.automations` | Somente via workspace + permissão |
| Analytics | `public.analytics_events` | Workspace + permissão (e admin global) |
| Media | `public.media_library`, `public.media_folders`, `public.media_tags`, `public.media_tag_assignments` | Alguns suportam fallback `workspace_id IS NULL` -> `user_id` |
| Webhooks | `public.webhooks` e tabelas-filhas (logs, secrets, retry, etc.) | Workspace + permissão; algumas com fallback `workspace_id IS NULL` -> `user_id` |

## Permissões por papel (alto nível)

> **Nota:** o mapeamento exato é definido na função `public.workspace_has_permission(role, permission)`.

### Papéis

- **owner**: controle total do workspace (todas as permissões).
- **admin**: quase total (normalmente todas as permissões operacionais).
- **member**: pode operar recursos do dia a dia, conforme domínio.
- **viewer**: leitura (view) dos domínios permitidos.

### Matriz (intenção)

| Permissão | owner | admin | member | viewer |
|---|:---:|:---:|:---:|:---:|
| `contacts.view` | ✅ | ✅ | ✅ | ✅ |
| `contacts.create` | ✅ | ✅ | ✅ | ❌ |
| `contacts.edit` | ✅ | ✅ | ✅ | ❌ |
| `contacts.delete` | ✅ | ✅ | ✅ | ❌ |
| `automations.view` | ✅ | ✅ | ✅ | ✅ |
| `automations.create` | ✅ | ✅ | ✅ | ❌ |
| `automations.edit` | ✅ | ✅ | ✅ | ❌ |
| `automations.delete` | ✅ | ✅ | ✅ | ❌ |
| `analytics.view` | ✅ | ✅ | ✅ | ✅ |
| `analytics.create` | ✅ | ✅ | ✅ | ❌ |
| `media.view` | ✅ | ✅ | ✅ | ✅ |
| `media.upload` | ✅ | ✅ | ✅ | ❌ |
| `media.manage` | ✅ | ✅ | ✅ | ❌ |
| `webhooks.view` | ✅ | ✅ | ✅ | ✅ |
| `webhooks.create` | ✅ | ✅ | ✅ | ❌ |
| `webhooks.edit` | ✅ | ✅ | ✅ | ❌ |
| `webhooks.delete` | ✅ | ✅ | ✅ | ❌ |
| `webhooks.manage` | ✅ | ✅ | ✅ | ❌ |

## Regras especiais

### `public.automation_metrics` (VIEW)

- É uma **view** e não recebe policies.
- Está configurada com `security_invoker=on`, então **respeita a RLS** das tabelas subjacentes para o usuário que executa a query.

### Tabelas com fallback para `user_id`

Em alguns casos (principalmente mídia/webhooks), quando `workspace_id IS NULL`, as policies permitem acesso se:

```
user_id = auth.uid()
```

Isso mantém compatibilidade com dados antigos/“pessoais”.
