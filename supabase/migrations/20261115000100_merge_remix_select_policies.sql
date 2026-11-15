-- One SELECT policy instead of two permissive ones (Supabase performance advisor 0006).
drop policy "Anyone reads public remixes" on public.remixes;
drop policy "Owners read their remixes" on public.remixes;
create policy "Read public remixes and your own" on public.remixes
  for select to anon, authenticated
  using (is_public or (select auth.uid()) = user_id);
