-- Community: opt-in public taste profiles, follows, weekly remix challenges,
-- and anonymous crowd signals used to recalibrate the flavor table.

-- Public profiles ---------------------------------------------------------------
-- A row exists only while a user has chosen to be visible. Everything in it is
-- public by design: a name, a taste vector, and the dishes they rated highly.
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  taste real[] not null check (cardinality(taste) = 8),
  favorites text[] not null default '{}' check (cardinality(favorites) <= 24),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Anyone reads public profiles" on public.profiles
  for select to anon, authenticated using (true);
create policy "Owners publish their profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners remove their profile" on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.profiles to anon;
grant select, insert, update, delete on public.profiles to authenticated;

-- Follows -------------------------------------------------------------------------
-- Private to the follower: nobody else can see who you follow.
create table public.follows (
  follower_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  followee_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_id_idx on public.follows (followee_id);

alter table public.follows enable row level security;

create policy "Followers read their follows" on public.follows
  for select to authenticated using ((select auth.uid()) = follower_id);
create policy "Followers follow" on public.follows
  for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "Followers unfollow" on public.follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

grant select, insert, delete on public.follows to authenticated;

-- Challenge entries ----------------------------------------------------------------
-- A public remix entered into a weekly challenge ("2026-W47"). The challenge
-- itself is derived in the app from the week; only entries and votes are stored.
create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_key text not null check (challenge_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  remix_id uuid not null references public.remixes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_key, user_id)
);

create index challenge_entries_remix_id_idx on public.challenge_entries (remix_id);
create index challenge_entries_user_id_idx on public.challenge_entries (user_id);

alter table public.challenge_entries enable row level security;

create policy "Anyone reads challenge entries" on public.challenge_entries
  for select to anon, authenticated using (true);
-- You can only enter your own remix, and it has to be public.
create policy "Cooks enter their public remixes" on public.challenge_entries
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and vote_count = 0
    and exists (
      select 1 from public.remixes r
      where r.id = remix_id and r.user_id = (select auth.uid()) and r.is_public
    )
  );
create policy "Cooks withdraw their entries" on public.challenge_entries
  for delete to authenticated using ((select auth.uid()) = user_id);
-- No update policy: vote_count changes only through the trigger below.

grant select on public.challenge_entries to anon;
grant select, insert, delete on public.challenge_entries to authenticated;

-- Challenge votes --------------------------------------------------------------------
-- One vote per person per entry. Who voted stays private; only the count is public.
create table public.challenge_votes (
  entry_id uuid not null references public.challenge_entries (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

create index challenge_votes_user_id_idx on public.challenge_votes (user_id);

alter table public.challenge_votes enable row level security;

create policy "Voters read their votes" on public.challenge_votes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Voters vote for other cooks" on public.challenge_votes
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.challenge_entries e
      where e.id = entry_id and e.user_id = (select auth.uid())
    )
  );
create policy "Voters take back their votes" on public.challenge_votes
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.challenge_votes to authenticated;

-- Keeps challenge_entries.vote_count in step with the votes table. Runs as the
-- table owner because voters have no right to update entries themselves.
create function public.sync_challenge_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.challenge_entries set vote_count = vote_count + 1 where id = new.entry_id;
  else
    update public.challenge_entries set vote_count = greatest(vote_count - 1, 0) where id = old.entry_id;
  end if;
  return null;
end;
$$;

revoke all on function public.sync_challenge_vote_count() from public, anon, authenticated;

create trigger challenge_votes_count
  after insert or delete on public.challenge_votes
  for each row execute function public.sync_challenge_vote_count();

-- Crowd signals -----------------------------------------------------------------------
-- How often cooks report each problem ("too salty") per recipe, with no user
-- information. The app uses this to recalibrate ingredient scores.
--
-- This deliberately reads across everyone's private cook_log, so it is SECURITY
-- DEFINER. What keeps it safe: it returns counts only, counts each person once
-- per recipe, covers unmodified recipes only, and leaves out any recipe cooked
-- by fewer than three different people.
create function public.crowd_signals()
returns table (recipe_id text, cooks integer, problem text, reports integer)
language sql
stable
security definer
set search_path = ''
as $$
  with per_cook as (
    select c.recipe_id, c.user_id, array_agg(distinct p.problem) filter (where p.problem is not null) as problems
    from public.cook_log c
    left join lateral unnest(c.problems) as p (problem) on true
    where c.remix_id is null
    group by c.recipe_id, c.user_id
  ),
  totals as (
    select pc.recipe_id, count(*)::integer as cooks
    from per_cook pc
    group by pc.recipe_id
    having count(*) >= 3
  )
  select t.recipe_id, t.cooks, p.problem, count(p.problem)::integer as reports
  from totals t
  join per_cook pc on pc.recipe_id = t.recipe_id
  left join lateral unnest(pc.problems) as p (problem) on true
  group by t.recipe_id, t.cooks, p.problem
  order by t.cooks desc
  limit 5000;
$$;

revoke all on function public.crowd_signals() from public;
grant execute on function public.crowd_signals() to anon, authenticated;
