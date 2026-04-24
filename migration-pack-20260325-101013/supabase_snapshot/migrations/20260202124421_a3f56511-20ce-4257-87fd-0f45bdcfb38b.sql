-- Create allowlist for webhook domains (enterprise)
create table if not exists public.webhook_domain_allowlist (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domain text not null,
  created_by uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists webhook_domain_allowlist_workspace_domain_uidx
  on public.webhook_domain_allowlist (workspace_id, lower(domain));

alter table public.webhook_domain_allowlist enable row level security;

drop policy if exists webhook_domain_allowlist_select on public.webhook_domain_allowlist;
drop policy if exists webhook_domain_allowlist_insert on public.webhook_domain_allowlist;
drop policy if exists webhook_domain_allowlist_update on public.webhook_domain_allowlist;
drop policy if exists webhook_domain_allowlist_delete on public.webhook_domain_allowlist;

-- Readable by members who can view webhooks in the workspace
create policy webhook_domain_allowlist_select
  on public.webhook_domain_allowlist
  for select
  using (
    is_workspace_member(workspace_id, auth.uid())
    and has_permission('webhooks.view', workspace_id)
  );

-- Manageable by members who can manage webhooks in the workspace
create policy webhook_domain_allowlist_insert
  on public.webhook_domain_allowlist
  for insert
  with check (
    is_workspace_member(workspace_id, auth.uid())
    and has_permission('webhooks.manage', workspace_id)
    and created_by = auth.uid()
  );

create policy webhook_domain_allowlist_update
  on public.webhook_domain_allowlist
  for update
  using (
    is_workspace_member(workspace_id, auth.uid())
    and has_permission('webhooks.manage', workspace_id)
  )
  with check (
    is_workspace_member(workspace_id, auth.uid())
    and has_permission('webhooks.manage', workspace_id)
  );

create policy webhook_domain_allowlist_delete
  on public.webhook_domain_allowlist
  for delete
  using (
    is_workspace_member(workspace_id, auth.uid())
    and has_permission('webhooks.manage', workspace_id)
  );
