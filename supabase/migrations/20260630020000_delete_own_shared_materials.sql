drop policy if exists "users can delete own shared materials"
  on public.shared_materials;

create policy "users can delete own shared materials"
  on public.shared_materials for delete
  to authenticated
  using (auth.uid() = user_id);
