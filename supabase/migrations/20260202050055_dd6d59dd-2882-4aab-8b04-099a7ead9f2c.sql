-- ZapFllow — RLS audit & hardening (workspace-permissions model)
-- Data: 2026-02-02
-- Correção: remove no-op inválido; inclui `automation_metrics` como VIEW com security_invoker.

-- 0) Helpers ---------------------------------------------------------------

create or replace function public.normalize_permission_name(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select replace(coalesce(p, ''), ':', '.');
$$;

create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = auth.uid()
      and public.workspace_has_permission(wm.workspace_id, public.normalize_permission_name(permission_name), auth.uid())
  );
$$;

create or replace function public.has_permission(permission_name text, workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_has_permission(workspace_id, public.normalize_permission_name(permission_name), auth.uid());
$$;

create or replace function public.workspace_has_permission(
  p_workspace_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text;
  perm text;
begin
  perm := public.normalize_permission_name(p_permission);
  r := public.workspace_user_role(p_workspace_id, p_user_id);

  if r is null then
    return false;
  end if;

  if r = 'owner' then
    return true;
  end if;

  if r = 'admin' then
    return perm in (
      'workspace.settings.update',
      'members.invite',
      'members.remove',
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'contacts.delete',
      'automations.view',
      'automations.create',
      'automations.edit',
      'automations.delete',
      'webhooks.view',
      'webhooks.create',
      'webhooks.edit',
      'webhooks.manage',
      'media.view',
      'media.upload',
      'media.manage',
      'analytics.view',
      'analytics.create'
    );
  end if;

  if r = 'member' then
    return perm in (
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'automations.view',
      'automations.create',
      'automations.edit',
      'webhooks.view',
      'webhooks.create',
      'webhooks.edit',
      'media.view',
      'media.upload',
      'analytics.view',
      'analytics.create'
    );
  end if;

  if r = 'viewer' then
    return perm in (
      'contacts.view',
      'automations.view',
      'webhooks.view',
      'media.view',
      'analytics.view'
    );
  end if;

  return false;
end;
$$;

-- 1) CONTATOS -------------------------------------------------------------

drop policy if exists workspace_members_select_contacts on public.contacts;
drop policy if exists workspace_members_insert_contacts on public.contacts;
drop policy if exists workspace_members_update_contacts on public.contacts;
drop policy if exists workspace_members_delete_contacts on public.contacts;

create policy workspace_members_select_contacts
on public.contacts
for select
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('contacts.view', workspace_id)
);

create policy workspace_members_insert_contacts
on public.contacts
for insert
to authenticated
with check (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('contacts.create', workspace_id)
);

create policy workspace_members_update_contacts
on public.contacts
for update
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('contacts.edit', workspace_id)
)
with check (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('contacts.edit', workspace_id)
);

create policy workspace_members_delete_contacts
on public.contacts
for delete
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('contacts.delete', workspace_id)
);

-- 2) AUTOMAÇÕES -----------------------------------------------------------

drop policy if exists workspace_members_select_automations on public.automations;
create policy workspace_members_select_automations
on public.automations
for select
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('automations.view', workspace_id)
);

drop policy if exists workspace_members_insert_automations on public.automations;
create policy workspace_members_insert_automations
on public.automations
for insert
to authenticated
with check (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('automations.create', workspace_id)
);

drop policy if exists workspace_members_update_automations on public.automations;
create policy workspace_members_update_automations
on public.automations
for update
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('automations.edit', workspace_id)
)
with check (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('automations.edit', workspace_id)
);

drop policy if exists workspace_members_delete_automations on public.automations;
create policy workspace_members_delete_automations
on public.automations
for delete
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('automations.delete', workspace_id)
);

-- 3) MÍDIA ----------------------------------------------------------------

drop policy if exists workspace_members_select_media on public.media_library;
create policy workspace_members_select_media
on public.media_library
for select
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('media.view', workspace_id)
);

drop policy if exists workspace_members_insert_media on public.media_library;
create policy workspace_members_insert_media
on public.media_library
for insert
to authenticated
with check (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('media.upload', workspace_id)
);

drop policy if exists workspace_members_update_media on public.media_library;
create policy workspace_members_update_media
on public.media_library
for update
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('media.manage', workspace_id)
)
with check (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('media.manage', workspace_id)
);

drop policy if exists workspace_members_delete_media on public.media_library;
create policy workspace_members_delete_media
on public.media_library
for delete
to authenticated
using (
  is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('media.manage', workspace_id)
);

-- media_folders (workspace-owned quando workspace_id != null; fallback user_id se null)
drop policy if exists "Users can manage own folders" on public.media_folders;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='media_folders'
  loop
    execute format('drop policy if exists %I on public.media_folders', pol.policyname);
  end loop;
end $$;

create policy media_folders_select
on public.media_folders
for select
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.view', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy media_folders_insert
on public.media_folders
for insert
to authenticated
with check (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy media_folders_update
on public.media_folders
for update
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
)
with check (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy media_folders_delete
on public.media_folders
for delete
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

-- media_tags (mesma lógica)
drop policy if exists "Users can manage own tags" on public.media_tags;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='media_tags'
  loop
    execute format('drop policy if exists %I on public.media_tags', pol.policyname);
  end loop;
end $$;

create policy media_tags_select
on public.media_tags
for select
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.view', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy media_tags_insert
on public.media_tags
for insert
to authenticated
with check (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy media_tags_update
on public.media_tags
for update
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
)
with check (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy media_tags_delete
on public.media_tags
for delete
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('media.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

-- media_tag_assignments (alinha com workspace do media_library)

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='media_tag_assignments'
  loop
    execute format('drop policy if exists %I on public.media_tag_assignments', pol.policyname);
  end loop;
end $$;

create policy media_tag_assignments_manage
on public.media_tag_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.media_library ml
    where ml.id = media_tag_assignments.media_id
      and is_workspace_member(ml.workspace_id, auth.uid())
      and public.has_permission('media.manage', ml.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.media_library ml
    where ml.id = media_tag_assignments.media_id
      and is_workspace_member(ml.workspace_id, auth.uid())
      and public.has_permission('media.manage', ml.workspace_id)
  )
);

-- 4) WEBHOOKS -------------------------------------------------------------

-- webhooks: workspace-owned quando workspace_id != null; fallback user_id se null

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhooks'
  loop
    execute format('drop policy if exists %I on public.webhooks', pol.policyname);
  end loop;
end $$;

create policy webhooks_select
on public.webhooks
for select
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('webhooks.view', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy webhooks_insert
on public.webhooks
for insert
to authenticated
with check (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('webhooks.create', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy webhooks_update
on public.webhooks
for update
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('webhooks.edit', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
)
with check (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('webhooks.edit', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

create policy webhooks_delete
on public.webhooks
for delete
to authenticated
using (
  (workspace_id is not null and is_workspace_member(workspace_id, auth.uid()) and public.has_permission('webhooks.manage', workspace_id))
  or (workspace_id is null and user_id = auth.uid())
);

-- webhook_logs

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhook_logs'
  loop
    execute format('drop policy if exists %I on public.webhook_logs', pol.policyname);
  end loop;
end $$;

create policy webhook_logs_select
on public.webhook_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_logs.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.view', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

-- webhook_conditions

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhook_conditions'
  loop
    execute format('drop policy if exists %I on public.webhook_conditions', pol.policyname);
  end loop;
end $$;

create policy webhook_conditions_manage
on public.webhook_conditions
for all
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_conditions.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.edit', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_conditions.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.edit', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

-- webhook_retry_queue

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhook_retry_queue'
  loop
    execute format('drop policy if exists %I on public.webhook_retry_queue', pol.policyname);
  end loop;
end $$;

create policy webhook_retry_queue_select
on public.webhook_retry_queue
for select
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_retry_queue.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.view', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

-- webhook_retry_config

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhook_retry_config'
  loop
    execute format('drop policy if exists %I on public.webhook_retry_config', pol.policyname);
  end loop;
end $$;

create policy webhook_retry_config_manage
on public.webhook_retry_config
for all
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_retry_config.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.manage', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_retry_config.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.manage', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

-- webhook_rate_limit

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhook_rate_limit'
  loop
    execute format('drop policy if exists %I on public.webhook_rate_limit', pol.policyname);
  end loop;
end $$;

create policy webhook_rate_limit_select
on public.webhook_rate_limit
for select
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_rate_limit.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.view', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

-- webhook_circuit_breaker

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhook_circuit_breaker'
  loop
    execute format('drop policy if exists %I on public.webhook_circuit_breaker', pol.policyname);
  end loop;
end $$;

create policy webhook_circuit_breaker_select
on public.webhook_circuit_breaker
for select
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_circuit_breaker.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.view', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

-- webhook_secrets

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='webhook_secrets'
  loop
    execute format('drop policy if exists %I on public.webhook_secrets', pol.policyname);
  end loop;
end $$;

create policy webhook_secrets_select
on public.webhook_secrets
for select
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_secrets.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.manage', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

create policy webhook_secrets_insert
on public.webhook_secrets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_secrets.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.manage', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

create policy webhook_secrets_update
on public.webhook_secrets
for update
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_secrets.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.manage', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_secrets.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.manage', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

create policy webhook_secrets_delete
on public.webhook_secrets
for delete
to authenticated
using (
  exists (
    select 1
    from public.webhooks w
    where w.id = webhook_secrets.webhook_id
      and (
        (w.workspace_id is not null and is_workspace_member(w.workspace_id, auth.uid()) and public.has_permission('webhooks.manage', w.workspace_id))
        or (w.workspace_id is null and w.user_id = auth.uid())
      )
  )
);

-- 5) ANALYTICS ------------------------------------------------------------

drop policy if exists workspace_members_select_analytics_events on public.analytics_events;
create policy workspace_members_select_analytics_events
on public.analytics_events
for select
to authenticated
using (
  workspace_id is not null
  and is_workspace_member(workspace_id, auth.uid())
  and public.has_permission('analytics.view', workspace_id)
);

drop policy if exists workspace_members_insert_analytics_events on public.analytics_events;
create policy workspace_members_insert_analytics_events
on public.analytics_events
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (is_workspace_member(workspace_id, auth.uid()) and public.has_permission('analytics.create', workspace_id))
  )
);

-- 6) VIEW: automation_metrics (security_invoker) --------------------------

create or replace view public.automation_metrics
with (security_invoker=on)
as
select
  a.id as automation_id,
  a.user_id,
  a.name,
  a.status,
  a.created_at,
  coalesce((select count(*) from public.analytics_events e where e.automation_id = a.id and e.event_type = 'message.sent'), 0)::bigint as messages_sent,
  coalesce((select count(*) from public.analytics_events e where e.automation_id = a.id and e.event_type = 'message.delivered'), 0)::bigint as messages_delivered,
  coalesce((select count(*) from public.analytics_events e where e.automation_id = a.id and e.event_type = 'message.read'), 0)::bigint as messages_read,
  coalesce((select count(*) from public.analytics_events e where e.automation_id = a.id and e.event_type = 'message.replied'), 0)::bigint as messages_replied,
  coalesce((select count(*) from public.analytics_events e where e.automation_id = a.id and e.event_type = 'message.failed'), 0)::bigint as messages_failed,
  coalesce((select count(distinct e.contact_id) from public.analytics_events e where e.automation_id = a.id and e.contact_id is not null), 0)::bigint as unique_contacts_reached,
  (select max(e.created_at) from public.analytics_events e where e.automation_id = a.id) as last_activity_at
from public.automations a;
