alter table public.leaderboard_profiles
  add column if not exists xp integer not null default 0;

alter table public.leaderboard_profiles
  add column if not exists completed_tasks integer not null default 0;

create index if not exists leaderboard_profiles_xp_rank_idx
  on public.leaderboard_profiles (xp desc, streak desc, last_study_date desc);
