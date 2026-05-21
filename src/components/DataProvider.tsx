'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore, SessionLog, Task } from '@/store/useStore';

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

// ── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  const hydrateGym = useStore((s) => s.gym.hydrate);
  const hydrateTasks = useStore((s) => s.tasks.hydrate);
  const setUserId = useStore((s) => s.setUserId);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      const [sessionsRes, tasksRes] = await Promise.all([
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
      ]);

      if (sessionsRes.data) hydrateGym(sessionsRes.data.map(dbToSession));
      if (tasksRes.data) hydrateTasks(tasksRes.data.map(dbToTask));
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
