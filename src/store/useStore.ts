'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// === Gym slice types ===
export type SetEntry = {
  weight?: number; // kg, undefined for bodyweight
  reps?: number;
  duration?: number; // seconds, for time-based
};

export type ExerciseLog = {
  exerciseId: string;
  sets: SetEntry[];
  notes?: string;
};

export type SessionLog = {
  id: string; // unique per session
  cycleNumber: number;
  dayNumber: number; // 1-4
  date: string; // ISO
  exercises: ExerciseLog[];
  durationMinutes?: number;
  feeling?: 'great' | 'good' | 'tough' | 'rough';
};

export type GymSlice = {
  sessions: SessionLog[];
  currentCycle: number;
  saveSession: (session: SessionLog) => void;
  deleteSession: (id: string) => void;
};

// === App-wide state ===
type AppState = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Modules
  gym: GymSlice;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      gym: {
        sessions: [],
        currentCycle: 1,
        saveSession: (session) =>
          set((s) => {
            // If session id exists, replace it; otherwise append
            const existing = s.gym.sessions.findIndex((x) => x.id === session.id);
            const sessions = [...s.gym.sessions];
            if (existing >= 0) sessions[existing] = session;
            else sessions.push(session);

            // Determine if we should advance the cycle
            const cycleSessions = sessions.filter((x) => x.cycleNumber === s.gym.currentCycle);
            const dayNumbers = new Set(cycleSessions.map((x) => x.dayNumber));
            const cycleComplete = dayNumbers.size === 4;
            const nextCycle = cycleComplete ? s.gym.currentCycle + 1 : s.gym.currentCycle;

            return {
              gym: { ...s.gym, sessions, currentCycle: nextCycle },
            };
          }),
        deleteSession: (id) =>
          set((s) => ({
            gym: { ...s.gym, sessions: s.gym.sessions.filter((x) => x.id !== id) },
          })),
      },
    }),
    {
      name: 'lifeos-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        gym: { sessions: state.gym.sessions, currentCycle: state.gym.currentCycle },
      }),
      // Merge persisted state without losing function references
      merge: (persisted: any, current) => {
        if (!persisted) return current;
        return {
          ...current,
          theme: persisted.theme ?? current.theme,
          gym: {
            ...current.gym,
            sessions: persisted.gym?.sessions ?? [],
            currentCycle: persisted.gym?.currentCycle ?? 1,
          },
        };
      },
    }
  )
);

// === Selectors / computed ===
export const useGymStats = () => {
  const sessions = useStore((s) => s.gym.sessions);
  const currentCycle = useStore((s) => s.gym.currentCycle);

  const totalSessions = sessions.length;
  const currentCycleSessions = sessions.filter((s) => s.cycleNumber === currentCycle);
  const cycleProgress = currentCycleSessions.length; // 0-4

  // Streak: count back from today, consecutive sessions in last N days
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
        if (diff <= 2) {
          streak++;
          lastDate = d;
        } else break;
      } else {
        const diff = Math.round((lastDate.getTime() - d.getTime()) / 86400000);
        if (diff <= 3) {
          streak++;
          lastDate = d;
        } else break;
      }
    }
  }

  return { totalSessions, cycleProgress, streak, currentCycle };
};

// Last entry for an exercise, for showing "last time" stats
export const useLastEntry = (exerciseId: string): ExerciseLog | null => {
  const sessions = useStore((s) => s.gym.sessions);
  for (let i = sessions.length - 1; i >= 0; i--) {
    const log = sessions[i].exercises.find((e) => e.exerciseId === exerciseId);
    if (log) return log;
  }
  return null;
};
