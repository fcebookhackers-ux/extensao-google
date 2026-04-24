-- Cookie consent preferences per user
create table if not exists public.cookie_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  essential boolean not null default true,
  analytics boolean not null default false,
  marketing boolean not null default false,
  functional boolean not null default false,
  consent_version text not null default '1',
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.cookie_preferences enable row level security;

create policy "Users can view their own cookie preferences"
on public.cookie_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own cookie preferences"
on public.cookie_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own cookie preferences"
on public.cookie_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own cookie preferences"
on public.cookie_preferences
for delete
to authenticated
using (auth.uid() = user_id);

-- Ensure updated_at is maintained
create trigger update_cookie_preferences_updated_at
before update on public.cookie_preferences
for each row
execute function public.update_updated_at_column();

create index if not exists idx_cookie_preferences_user_id
on public.cookie_preferences (user_id);
