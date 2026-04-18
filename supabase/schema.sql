-- Run this in the Supabase SQL Editor

-- Users table (Firebase UID as primary key)
create table if not exists users (
  id text primary key,
  name text not null,
  surname text not null,
  phone text not null,
  profile_complete boolean default false,
  created_at timestamptz default now()
);

-- Divisions table
create table if not exists divisions (
  id text primary key,
  league text not null,
  number integer not null
);

-- Insert all 15 divisions
insert into divisions (id, league, number) values
  ('gold-1','gold',1),('gold-2','gold',2),('gold-3','gold',3),('gold-4','gold',4),('gold-5','gold',5),
  ('silver-1','silver',1),('silver-2','silver',2),('silver-3','silver',3),('silver-4','silver',4),('silver-5','silver',5),
  ('bronze-1','bronze',1),('bronze-2','bronze',2),('bronze-3','bronze',3),('bronze-4','bronze',4),('bronze-5','bronze',5)
on conflict do nothing;

-- Teams table (5 teams per division)
create table if not exists teams (
  id text primary key,
  division_id text references divisions(id),
  name text not null,
  player1_id text references users(id),
  player2_id text references users(id)
);

-- Insert all teams (5 per division × 15 divisions = 75 teams)
do $$
declare
  leagues text[] := array['gold','silver','bronze'];
  l text;
  i int;
  j int;
begin
  foreach l in array leagues loop
    for i in 1..5 loop
      for j in 1..5 loop
        insert into teams (id, division_id, name)
        values (l||'-'||i||'-team-'||j, l||'-'||i, 'Команда '||j)
        on conflict do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- Matches table
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  division_id text references divisions(id),
  home_team_id text references teams(id),
  away_team_id text references teams(id),
  date text not null,
  time text not null,
  status text default 'pending',
  booked_by text references users(id),
  confirmed_by text[] default '{}',
  required_players text[] default '{}',
  created_at timestamptz default now()
);

-- Notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id),
  match_id uuid references matches(id),
  division_id text,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Disable RLS for MVP (enable and add policies in production)
alter table users disable row level security;
alter table divisions disable row level security;
alter table teams disable row level security;
alter table matches disable row level security;
alter table notifications disable row level security;

-- Enable realtime
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table notifications;
