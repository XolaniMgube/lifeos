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
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists gym_sessions_user_id_idx on gym_sessions (user_id);
create index if not exists gym_sessions_user_date_idx on gym_sessions (user_id, date desc);

alter table gym_sessions enable row level security;

drop policy if exists "gym_sessions: own rows only" on gym_sessions;

create policy "gym_sessions: own rows only"
  on gym_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Goals ───────────────────────────────────────────────────
create table if not exists goals (
  id            text        primary key,
  user_id       uuid        references auth.users not null,
  title         text        not null,
  status        text        not null default 'active',
  horizon       text        not null default 'quarter',
  created_at    text        not null,
  target_date   text,
  completed_at  text,
  area          text,
  why           text,
  notes         text,
  metric_label  text,
  current_value numeric,
  target_value  numeric,
  updated_at    timestamptz not null default now()
);

create index if not exists goals_user_id_idx on goals (user_id);
create index if not exists goals_user_status_idx on goals (user_id, status);

alter table goals enable row level security;

drop policy if exists "goals: own rows only" on goals;

create policy "goals: own rows only"
  on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Tasks ────────────────────────────────────────────────────
create table if not exists tasks (
  id           text        primary key,
  user_id      uuid        references auth.users not null,
  title        text        not null,
  status       text        not null default 'open'
                           constraint tasks_status_check check (status in ('open', 'done', 'cancelled')),
  priority     text        not null default 'medium'
                           constraint tasks_priority_check check (priority in ('high', 'medium', 'low')),
  due_date     text,       -- 'YYYY-MM-DD' local date string
  completed_at text,       -- ISO datetime string
  created_at   text        not null,
  notes        text,
  area         text        constraint tasks_area_check check (area is null or area in ('health', 'finance', 'growth', 'work', 'personal')),
  goal_id      text references goals(id) on delete set null,
  updated_at   timestamptz not null default now()
);

alter table tasks add column if not exists goal_id text;

create index if not exists tasks_user_id_idx on tasks (user_id);
create index if not exists tasks_user_status_idx on tasks (user_id, status);
create index if not exists tasks_user_due_date_idx on tasks (user_id, due_date);
create index if not exists tasks_goal_id_idx on tasks (goal_id);

alter table tasks enable row level security;

drop policy if exists "tasks: own rows only" on tasks;

create policy "tasks: own rows only"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── updated_at maintenance ──────────────────────────────────
create or replace function set_lifeos_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gym_sessions_set_updated_at on gym_sessions;
create trigger gym_sessions_set_updated_at
  before update on gym_sessions
  for each row execute function set_lifeos_updated_at();

drop trigger if exists goals_set_updated_at on goals;
create trigger goals_set_updated_at
  before update on goals
  for each row execute function set_lifeos_updated_at();

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_lifeos_updated_at();
