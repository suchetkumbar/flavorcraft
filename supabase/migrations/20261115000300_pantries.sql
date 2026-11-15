-- One pantry list per user, synced from the "Cook with what you have" page.
create table public.pantries (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  items text[] not null default '{}' check (cardinality(items) <= 80),
  updated_at timestamptz not null default now()
);

alter table public.pantries enable row level security;

create policy "Owners read their pantry" on public.pantries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners create their pantry" on public.pantries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their pantry" on public.pantries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.pantries to authenticated;
