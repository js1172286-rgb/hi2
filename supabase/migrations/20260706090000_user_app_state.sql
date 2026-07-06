create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  saved_lessons jsonb not null default '[]'::jsonb,
  saved_notes jsonb not null default '[]'::jsonb,
  study_pet jsonb not null default '{}'::jsonb,
  knowledge_stats jsonb not null default '[]'::jsonb,
  intervaling_plans jsonb not null default '[]'::jsonb,
  custom_calendar_events jsonb not null default '[]'::jsonb,
  learning_xp jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

drop policy if exists "read own app state"
  on public.user_app_state;

drop policy if exists "insert own app state"
  on public.user_app_state;

drop policy if exists "update own app state"
  on public.user_app_state;

create policy "read own app state"
  on public.user_app_state for select
  to authenticated
  using (auth.uid() = user_id);

create policy "insert own app state"
  on public.user_app_state for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "update own app state"
  on public.user_app_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
