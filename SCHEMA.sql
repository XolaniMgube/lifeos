-- ============================================================
-- LifeOS — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── Gym sessions ─────────────────────────────────────────────
create table if not exists gym_sessions (
  id              text        primary key,
  user_id         uuid        references auth.users not null,
  cycle_number    integer     not null,
  day_number      integer     not null,
  date            text        not null, -- ISO string, e.g. "2025-05-21T10:00:00.000Z"
  exercises       jsonb       not null default '[]',
  duration_minutes integer,
  feeling         text,
  created_at      timestamptz default now()
);

alter table gym_sessions enable row level security;

create policy "gym_sessions: own rows only"
  on gym_sessions for all
  using (auth.uid() = user_id);

-- ── Tasks ────────────────────────────────────────────────────
create table if not exists tasks (
  id           text        primary key,
  user_id      uuid        references auth.users not null,
  title        text        not null,
  status       text        not null default 'open',
  priority     text        not null default 'medium',
  due_date     text,       -- 'YYYY-MM-DD' local date string
  completed_at text,       -- ISO datetime string
  created_at   text        not null,
  notes        text,
  area         text,
  goal_id      text
);

alter table tasks enable row level security;

create policy "tasks: own rows only"
  on tasks for all
  using (auth.uid() = user_id);
