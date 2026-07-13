'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// === Tasks slice types ===
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'open' | 'done' | 'cancelled';
export type TaskArea = 'health' | 'finance' | 'growth' | 'work' | 'personal';

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;      // 'YYYY-MM-DD' local date
  completedAt?: string;  // ISO datetime
  createdAt: string;     // ISO datetime
  notes?: string;
  area?: TaskArea;
  goalId?: string;       // stub for Goals module
};

export type TasksSlice = {
  tasks: Task[];
  hydrate: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
};

// === Goals slice types ===
export type GoalStatus = 'active' | 'paused' | 'done' | 'dropped';
export type GoalHorizon = 'quarter' | 'year' | 'long-term';

export type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  horizon: GoalHorizon;
  createdAt: string;
  targetDate?: string;
  completedAt?: string;
  area?: TaskArea;
  why?: string;
  notes?: string;
  metricLabel?: string;
  currentValue?: number;
  targetValue?: number;
};

export type GoalsSlice = {
  goals: Goal[];
  hydrate: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
};

// === Gym slice types ===
export type SetEntry = {
  weight?: number;
  reps?: number;
  duration?: number;
};

export type ExerciseLog = {
  exerciseId: string;
  sets: SetEntry[];
  notes?: string;
};

export type SessionLog = {
  id: string;
  cycleNumber: number;
  dayNumber: number;
  date: string;
  exercises: ExerciseLog[];
  durationMinutes?: number;
  feeling?: 'great' | 'good' | 'tough' | 'rough';
};

export type GymSlice = {
  sessions: SessionLog[];
  currentCycle: number;
  hydrate: (sessions: SessionLog[]) => void;
  saveSession: (session: SessionLog) => void;
  deleteSession: (id: string) => void;
};

// === App-wide state ===
type AppState = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  dataStatus: 'loading' | 'ready' | 'error';
  dataError: string | null;
  setDataStatus: (status: 'loading' | 'ready' | 'error', error?: string | null) => void;
  userId: string | null;
  userEmail: string | null;
  setUserId: (id: string | null) => void;
  setUserEmail: (email: string | null) => void;
  // Modules
  gym: GymSlice;
  tasks: TasksSlice;
  goals: GoalsSlice;
};

function computeCurrentCycle(sessions: SessionLog[]): number {
  if (sessions.length === 0) return 1;
  const maxCycle = Math.max(...sessions.map((s) => s.cycleNumber));
  for (let cycle = maxCycle; cycle >= 1; cycle--) {
    const days = new Set(sessions.filter((s) => s.cycleNumber === cycle).map((s) => s.dayNumber));
    if (days.size < 4) return cycle;
  }
  return maxCycle + 1;
}

// Theme is the only thing persisted to localStorage — all data comes from Supabase
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      dataStatus: 'loading',
      dataError: null,
      setDataStatus: (status, error = null) => set({ dataStatus: status, dataError: error }),
      userId: null,
      userEmail: null,
      setUserId: (id) => set({ userId: id }),
      setUserEmail: (email) => set({ userEmail: email }),

      gym: {
        sessions: [],
        currentCycle: 1,
        hydrate: (sessions) =>
          set((s) => ({
            gym: { ...s.gym, sessions, currentCycle: computeCurrentCycle(sessions) },
          })),
        saveSession: (session) =>
          set((s) => {
            const existing = s.gym.sessions.findIndex((x) => x.id === session.id);
            const sessions = [...s.gym.sessions];
            if (existing >= 0) sessions[existing] = session;
            else sessions.push(session);
            return {
              gym: { ...s.gym, sessions, currentCycle: computeCurrentCycle(sessions) },
            };
          }),
        deleteSession: (id) =>
          set((s) => {
            const sessions = s.gym.sessions.filter((x) => x.id !== id);
            return {
              gym: { ...s.gym, sessions, currentCycle: computeCurrentCycle(sessions) },
            };
          }),
      },

      tasks: {
        tasks: [],
        hydrate: (tasks) => set((s) => ({ tasks: { ...s.tasks, tasks } })),
        addTask: (task) =>
          set((s) => ({ tasks: { ...s.tasks, tasks: [...s.tasks.tasks, task] } })),
        updateTask: (id, patch) =>
          set((s) => ({
            tasks: {
              ...s.tasks,
              tasks: s.tasks.tasks.map((t) => {
                if (t.id !== id) return t;
                const completedAt =
                  patch.completedAt !== undefined
                    ? patch.completedAt
                    : patch.status === 'done' && !t.completedAt
                      ? new Date().toISOString()
                      : patch.status && patch.status !== 'done'
                        ? undefined
                        : t.completedAt;
                return { ...t, ...patch, completedAt };
              }),
            },
          })),
        deleteTask: (id) =>
          set((s) => ({
            tasks: { ...s.tasks, tasks: s.tasks.tasks.filter((t) => t.id !== id) },
          })),
      },

      goals: {
        goals: [],
        hydrate: (goals) => set((s) => ({ goals: { ...s.goals, goals } })),
        addGoal: (goal) =>
          set((s) => ({ goals: { ...s.goals, goals: [...s.goals.goals, goal] } })),
        updateGoal: (id, patch) =>
          set((s) => ({
            goals: {
              ...s.goals,
              goals: s.goals.goals.map((g) => {
                if (g.id !== id) return g;
                const completedAt =
                  patch.status === 'done' && !g.completedAt
                    ? new Date().toISOString()
                    : patch.status && patch.status !== 'done'
                    ? undefined
                    : g.completedAt;
                return { ...g, ...patch, completedAt };
              }),
            },
          })),
        deleteGoal: (id) =>
          set((s) => ({
            goals: { ...s.goals, goals: s.goals.goals.filter((g) => g.id !== id) },
            tasks: {
              ...s.tasks,
              tasks: s.tasks.tasks.map((t) => (t.goalId === id ? { ...t, goalId: undefined } : t)),
            },
          })),
      },
    }),
    {
      name: 'lifeos-theme',
      storage: createJSONStorage(() => localStorage),
      // Only persist theme — all module data comes from Supabase
      partialize: (state) => ({ theme: state.theme }),
      merge: (persisted: any, current) => ({
        ...current,
        theme: persisted?.theme ?? current.theme,
      }),
    }
  )
);

// === Selectors / computed ===
export const useGymStats = () => {
  const sessions = useStore((s) => s.gym.sessions);
  const currentCycle = useStore((s) => s.gym.currentCycle);

  const totalSessions = sessions.length;
  const currentCycleSessions = sessions.filter((s) => s.cycleNumber === currentCycle);
  const cycleProgress = currentCycleSessions.length;

  const sortedDates = [...sessions]
    .map((s) => new Date(s.date).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  if (sortedDates.length > 0) {
    const today = new Date();
    let cursor = new Date(today);
    let lastDate: Date | null = null;
    for (const dStr of sortedDates) {
      const d = new Date(dStr);
      if (!lastDate) {
        const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
        if (diff <= 2) { streak++; lastDate = d; } else break;
      } else {
        const diff = Math.round((lastDate.getTime() - d.getTime()) / 86400000);
        if (diff <= 3) { streak++; lastDate = d; } else break;
      }
    }
  }

  return { totalSessions, cycleProgress, streak, currentCycle };
};

export const useLastEntry = (exerciseId: string): ExerciseLog | null => {
  const sessions = useStore((s) => s.gym.sessions);
  for (let i = sessions.length - 1; i >= 0; i--) {
    const log = sessions[i].exercises.find((e) => e.exerciseId === exerciseId);
    if (log) return log;
  }
  return null;
};
