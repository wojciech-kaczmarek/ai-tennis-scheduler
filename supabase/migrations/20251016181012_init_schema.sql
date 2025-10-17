-- migration: 20251016181012_init_schema.sql
-- description: initial database schema for ai tennis scheduler.
-- author: cline @ brave ai
--
-- this migration sets up the initial database structure for the ai tennis scheduler application.
-- it includes tables for tournaments, players, schedules, matches, and their relationships,
-- as well as necessary types, indexes, and row-level security policies.

-- section: custom types
-- description: defines custom data types used in the schema.

create type public.tournament_type as enum ('singles', 'doubles');

-- section: tables
-- description: creates the core tables for the application.

-- table: public.tournaments
-- stores tournament information created by users.
create table public.tournaments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id),
    name text not null,
    type public.tournament_type not null,
    courts smallint not null,
    players_count smallint not null,
    created_at timestamptz not null default now()
);
comment on table public.tournaments is 'stores tournament information created by users.';

-- table: public.players
-- stores player information for each tournament.
create table public.players (
    id uuid primary key default uuid_generate_v4(),
    tournament_id uuid not null references public.tournaments(id) on delete cascade,
    name text,
    placeholder_name text not null
);
comment on table public.players is 'stores player information for each tournament.';

-- table: public.schedules
-- stores the generated schedule for a tournament.
create table public.schedules (
    id uuid primary key default uuid_generate_v4(),
    tournament_id uuid not null unique references public.tournaments(id) on delete cascade
);
comment on table public.schedules is 'stores the generated schedule for a tournament.';

-- table: public.matches
-- stores individual matches within a schedule.
create table public.matches (
    id uuid primary key default uuid_generate_v4(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    court_number smallint not null,
    match_order_on_court smallint not null,
    unique (schedule_id, court_number, match_order_on_court)
);
comment on table public.matches is 'stores individual matches within a schedule.';

-- table: public.match_players
-- a junction table linking players to matches.
create table public.match_players (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid not null references public.matches(id) on delete cascade,
    player_id uuid not null references public.players(id) on delete cascade,
    team smallint
);
comment on table public.match_players is 'a junction table linking players to matches.';

-- section: indexes
-- description: creates indexes to improve query performance.

create index idx_tournaments_user_id on public.tournaments(user_id);
create index idx_players_tournament_id on public.players(tournament_id);
create index idx_matches_schedule_id on public.matches(schedule_id);
create index idx_match_players_match_id on public.match_players(match_id);
create index idx_match_players_player_id on public.match_players(player_id);

-- section: row-level security (rls)
-- description: sets up rls policies to protect user data.

-- enable rls on the tournaments table
alter table public.tournaments enable row level security;

-- policy: allow users to view their own tournaments
create policy "allow users to view their own tournaments"
on public.tournaments for select
using (auth.uid() = user_id);

-- policy: allow users to create their own tournaments
create policy "allow users to create their own tournaments"
on public.tournaments for insert
with check (auth.uid() = user_id);

-- policy: allow users to update their own tournaments
create policy "allow users to update their own tournaments"
on public.tournaments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- policy: allow users to delete their own tournaments
create policy "allow users to delete their own tournaments"
on public.tournaments for delete
using (auth.uid() = user_id);
