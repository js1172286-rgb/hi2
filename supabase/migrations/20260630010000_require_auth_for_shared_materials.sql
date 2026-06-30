alter table public.shared_materials
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists shared_materials_user_id_idx
  on public.shared_materials(user_id);

drop policy if exists "anyone can upload shared materials"
  on public.shared_materials;

drop policy if exists "signed in users can upload shared materials"
  on public.shared_materials;

create policy "signed in users can upload shared materials"
  on public.shared_materials for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and length(trim(subject)) between 1 and 80
    and length(trim(title)) between 1 and 120
    and length(trim(material)) between 1 and 20000
  );
