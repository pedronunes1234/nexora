-- NEXORA · esquema do Supabase (opcional). Rode no SQL Editor do seu projeto.
-- Pode ser executado várias vezes sem erro.
create table if not exists public.nx_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  tbl text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, tbl, id)
);
create index if not exists nx_records_user_updated on public.nx_records (user_id, updated_at);

alter table public.nx_records enable row level security;

drop policy if exists "nx_select_own" on public.nx_records;
drop policy if exists "nx_insert_own" on public.nx_records;
drop policy if exists "nx_update_own" on public.nx_records;
drop policy if exists "nx_delete_own" on public.nx_records;

create policy "nx_select_own" on public.nx_records for select using (auth.uid() = user_id);
create policy "nx_insert_own" on public.nx_records for insert with check (auth.uid() = user_id);
create policy "nx_update_own" on public.nx_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nx_delete_own" on public.nx_records for delete using (auth.uid() = user_id);
