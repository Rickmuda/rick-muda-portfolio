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

-- Game scoreboards (Games folder -> Scoreboards window).
-- Row Level Security grants the anon role both INSERT and SELECT (unlike
-- subscribers, these rows are meant to be publicly readable) but never
-- UPDATE/DELETE, so a submitted score can't be edited or removed afterward.
-- The per-game CHECK constraint below rejects implausible values server-side
-- (e.g. a Tetris score of 99999999) - a plausibility floor, not full anti-cheat:
-- since the anon key is necessarily public, a determined visitor could still
-- POST a fake-but-in-range score directly, the same limitation the
-- subscribers table already has against bots.
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('minesweeper', 'tetris', 'flappyRick', 'solitaire')),
  variant text,        -- Minesweeper difficulty ('easy'/'medium'/'hard'); null for the other 3 games
  metric text not null check (metric in ('score', 'time_seconds')), -- higher-is-better vs lower-is-better
  player_name text not null check (char_length(player_name) between 1 and 20),
  value integer not null check (
    (game = 'tetris'      and value between 0 and 999999) or
    (game = 'flappyRick'  and value between 0 and 9999)   or
    (game = 'minesweeper' and value between 1 and 999)    or
    (game = 'solitaire'   and value between 1 and 3600)
  ),
  created_at timestamptz not null default now()
);

alter table public.game_scores enable row level security;

create policy "anon can submit a score"
  on public.game_scores
  for insert
  to anon
  with check (true);

create policy "anyone can read scores"
  on public.game_scores
  for select
  to anon
  using (true);
