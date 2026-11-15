-- One row per AI assistant request, used for per-user daily limits.
create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('swap', 'fix')),
  created_at timestamptz not null default now()
);

create index ai_requests_user_created_idx on public.ai_requests (user_id, created_at desc);

alter table public.ai_requests enable row level security;

create policy "Owners read their AI requests" on public.ai_requests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners record their AI requests" on public.ai_requests
  for insert to authenticated with check ((select auth.uid()) = user_id);

grant select, insert on public.ai_requests to authenticated;
