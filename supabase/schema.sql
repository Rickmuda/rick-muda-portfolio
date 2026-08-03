-- Newsletter subscribers table.
-- Run once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Row Level Security only grants INSERT to the public "anon" role, so the
-- anon key (safe to ship in client code, see src/newsletterConfig.js) can
-- only ever add a row - it can never list, edit or delete subscribers.
-- Reading/deleting is only possible with the service_role key, which stays
-- server-side (GitHub Actions secret + the unsubscribe edge function).

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

create policy "anon can subscribe"
  on public.subscribers
  for insert
  to anon
  with check (true);
