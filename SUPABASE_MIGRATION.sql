-- ============================================================
-- LifeOS persistence hardening migration
-- Run once in Supabase Dashboard → SQL Editor.
-- Safe for the tables created by the original SCHEMA.sql.
-- ============================================================

begin;

alter table gym_sessions add column if not exists updated_at timestamptz not null default now();
alter table goals add column if not exists updated_at timestamptz not null default now();
alter table tasks add column if not exists updated_at timestamptz not null default now();

create index if not exists gym_sessions_user_id_idx on gym_sessions (user_id);
create index if not exists gym_sessions_user_date_idx on gym_sessions (user_id, date desc);
create index if not exists goals_user_id_idx on goals (user_id);
create index if not exists goals_user_status_idx on goals (user_id, status);
create index if not exists tasks_user_id_idx on tasks (user_id);
create index if not exists tasks_user_status_idx on tasks (user_id, status);
create index if not exists tasks_user_due_date_idx on tasks (user_id, due_date);
create index if not exists tasks_goal_id_idx on tasks (goal_id);

-- Attach tasks to real goals. NOT VALID permits any old orphaned links while
-- enforcing the relationship for every new write.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_goal_id_fkey' and conrelid = 'tasks'::regclass
  ) then
    alter table tasks
      add constraint tasks_goal_id_fkey
      foreign key (goal_id) references goals(id) on delete set null not valid;
  end if;
end;
$$;

alter table gym_sessions enable row level security;
alter table goals enable row level security;
alter table tasks enable row level security;

drop policy if exists "gym_sessions: own rows only" on gym_sessions;
create policy "gym_sessions: own rows only"
  on gym_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "goals: own rows only" on goals;
create policy "goals: own rows only"
  on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tasks: own rows only" on tasks;
create policy "tasks: own rows only"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

commit;
