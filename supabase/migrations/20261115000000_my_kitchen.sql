-- FlavorCraft "My Kitchen": saved recipes, remixes (forks with lineage) and a cooking log.
-- Recipe ids are text because recipes come from TheMealDB ("mdb-52772") or local
-- originals ("fc-..."), not from this database.

-- Saved recipes ----------------------------------------------------------------
create table public.saved_recipes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id text not null check (char_length(recipe_id) between 1 and 100),
  saved_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.saved_recipes enable row level security;

create policy "Owners read their saved recipes" on public.saved_recipes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners save recipes" on public.saved_recipes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners unsave recipes" on public.saved_recipes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Remixes ------------------------------------------------------------------------
-- A remix is a modified ingredient list based on a recipe, or on another remix
-- (parent_remix_id), which forms the "forked from" family tree.
create table public.remixes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_recipe_id text not null check (char_length(parent_recipe_id) between 1 and 100),
  parent_remix_id uuid references public.remixes (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  note text check (char_length(note) <= 2000),
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) <= 60),
  removed text[] not null default '{}' check (cardinality(removed) <= 60),
  added text[] not null default '{}' check (cardinality(added) <= 60),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index remixes_user_id_idx on public.remixes (user_id);
create index remixes_parent_recipe_id_idx on public.remixes (parent_recipe_id);
create index remixes_parent_remix_id_idx on public.remixes (parent_remix_id);

alter table public.remixes enable row level security;

create policy "Anyone reads public remixes" on public.remixes
  for select to anon, authenticated using (is_public);
create policy "Owners read their remixes" on public.remixes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners create remixes" on public.remixes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their remixes" on public.remixes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners delete their remixes" on public.remixes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Cooking log ----------------------------------------------------------------------
create table public.cook_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id text not null check (char_length(recipe_id) between 1 and 100),
  remix_id uuid references public.remixes (id) on delete set null,
  cooked_at timestamptz not null default now(),
  rating smallint check (rating between 1 and 5),
  problems text[] not null default '{}' check (
    problems <@ array['too-salty', 'too-sweet', 'too-sour', 'too-bitter', 'too-spicy', 'too-heavy', 'flat', 'no-depth']::text[]
  ),
  note text check (char_length(note) <= 2000)
);

create index cook_log_user_id_idx on public.cook_log (user_id);
create index cook_log_remix_id_idx on public.cook_log (remix_id);

alter table public.cook_log enable row level security;

create policy "Owners read their cook log" on public.cook_log
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners add to their cook log" on public.cook_log
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their cook log" on public.cook_log
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners delete from their cook log" on public.cook_log
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Data API access (RLS above decides which rows) ------------------------------------
grant select, insert, delete on public.saved_recipes to authenticated;
grant select on public.remixes to anon;
grant select, insert, update, delete on public.remixes to authenticated;
grant select, insert, update, delete on public.cook_log to authenticated;
