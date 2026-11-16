-- Per-user taste settings: the taste quiz result and the people they cook for.
create table public.kitchen_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  quiz_vector real[] check (quiz_vector is null or cardinality(quiz_vector) = 8),
  quiz_taken_at timestamptz,
  household jsonb not null default '[]' check (jsonb_typeof(household) = 'array' and jsonb_array_length(household) <= 8),
  updated_at timestamptz not null default now()
);

alter table public.kitchen_settings enable row level security;

create policy "Owners read their settings" on public.kitchen_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners create their settings" on public.kitchen_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their settings" on public.kitchen_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.kitchen_settings to authenticated;
