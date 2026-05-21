'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore, SessionLog, Task, Goal } from '@/store/useStore';

// ── DB row → TypeScript type converters ─────────────────────────────────────

function dbToSession(row: any): SessionLog {
  return {
    id: row.id,
    cycleNumber: row.cycle_number,
    dayNumber: row.day_number,
    date: row.date,
    exercises: row.exercises,
    durationMinutes: row.duration_minutes ?? undefined,
    feeling: row.feeling ?? undefined,
  };
}

function dbToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    notes: row.notes ?? undefined,
    area: row.area ?? undefined,
    goalId: row.goal_id ?? undefined,
  };
}

function dbToGoal(row: any): Goal {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    horizon: row.horizon,
    createdAt: row.created_at,
    targetDate: row.target_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    area: row.area ?? undefined,
    why: row.why ?? undefined,
    notes: row.notes ?? undefined,
    metricLabel: row.metric_label ?? undefined,
    currentValue: row.current_value ?? undefined,
    targetValue: row.target_value ?? undefined,
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  const hydrateGym = useStore((s) => s.gym.hydrate);
  const hydrateTasks = useStore((s) => s.tasks.hydrate);
  const hydrateGoals = useStore((s) => s.goals.hydrate);
  const setUserId = useStore((s) => s.setUserId);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      const [sessionsRes, tasksRes, goalsRes] = await Promise.all([
        supabase
          .from('gym_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true }),
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
      ]);

      if (sessionsRes.data) hydrateGym(sessionsRes.data.map(dbToSession));
      if (tasksRes.data) hydrateTasks(tasksRes.data.map(dbToTask));
      if (goalsRes.data) hydrateGoals(goalsRes.data.map(dbToGoal));
    }

    load();

    // Keep userId in sync when auth state changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        load();
      }
      if (event === 'SIGNED_OUT') {
        setUserId(null);
        hydrateGym([]);
        hydrateTasks([]);
        hydrateGoals([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

// ── TypeScript → DB row converters (exported for use in page components) ────

export function sessionToDb(session: SessionLog, userId: string) {
  return {
    id: session.id,
    user_id: userId,
    cycle_number: session.cycleNumber,
    day_number: session.dayNumber,
    date: session.date,
    exercises: session.exercises,
    duration_minutes: session.durationMinutes ?? null,
    feeling: session.feeling ?? null,
  };
}

export function taskToDb(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate ?? null,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    notes: task.notes ?? null,
    area: task.area ?? null,
    goal_id: task.goalId ?? null,
  };
}

export function goalToDb(goal: Goal, userId: string) {
  return {
    id: goal.id,
    user_id: userId,
    title: goal.title,
    status: goal.status,
    horizon: goal.horizon,
    created_at: goal.createdAt,
    target_date: goal.targetDate ?? null,
    completed_at: goal.completedAt ?? null,
    area: goal.area ?? null,
    why: goal.why ?? null,
    notes: goal.notes ?? null,
    metric_label: goal.metricLabel ?? null,
    current_value: goal.currentValue ?? null,
    target_value: goal.targetValue ?? null,
  };
}
