create table if not exists public.leaderboard_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  streak integer not null default 0,
  last_study_date date,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_profiles enable row level security;

drop policy if exists "anyone can read leaderboard profiles"
  on public.leaderboard_profiles;

drop policy if exists "users can insert own leaderboard profile"
  on public.leaderboard_profiles;

drop policy if exists "users can update own leaderboard profile"
  on public.leaderboard_profiles;

create policy "anyone can read leaderboard profiles"
  on public.leaderboard_profiles for select
  using (true);

create policy "users can insert own leaderboard profile"
  on public.leaderboard_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own leaderboard profile"
  on public.leaderboard_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
