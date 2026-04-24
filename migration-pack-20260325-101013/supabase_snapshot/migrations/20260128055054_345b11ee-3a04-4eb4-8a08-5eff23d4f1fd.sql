-- Trial access tracking
create table if not exists public.trial_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  trial_started_at timestamptz not null default now(),
  trial_days integer not null default 7,
  override_unlimited boolean not null default false,
  subscribed_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trial_access enable row level security;

-- Policies (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trial_access'
      and policyname = 'Users can view their own trial status'
  ) then
    execute 'create policy "Users can view their own trial status" on public.trial_access for select to authenticated using (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trial_access'
      and policyname = 'Users can create their own trial status'
  ) then
    execute 'create policy "Users can create their own trial status" on public.trial_access for insert to authenticated with check (auth.uid() = user_id)';
  end if;
end $$;

-- updated_at trigger (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'update_trial_access_updated_at'
  ) then
    create trigger update_trial_access_updated_at
    before update on public.trial_access
    for each row
    execute function public.update_updated_at_column();
  end if;
end $$;


-- Roles (admins bypass trial)
do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Policy: users read own roles (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'Users can view their own roles'
  ) then
    execute 'create policy "Users can view their own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id)';
  end if;
end $$;

-- SECURITY DEFINER helper for checks
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;