create table if not exists public.shared_materials (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  title text not null,
  material text not null,
  created_at timestamptz not null default now()
);

alter table public.shared_materials enable row level security;

create policy "anyone can read shared materials"
  on public.shared_materials for select
  using (true);

create policy "anyone can upload shared materials"
  on public.shared_materials for insert
  with check (
    length(trim(subject)) between 1 and 80
    and length(trim(title)) between 1 and 120
    and length(trim(material)) between 1 and 20000
  );
