'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { days } from '@/data/days';
import { exercises } from '@/data/exercises';
import { useStore, ExerciseLog, SessionLog, useLastEntry } from '@/store/useStore';
import { createClient } from '@/lib/supabase';
import { sessionToDb } from '@/components/DataProvider';

function LogPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const dayParam = parseInt(params.get('day') || '1', 10);
  const day = days.find((d) => d.id === dayParam) ?? days[0];

  const currentCycle = useStore((s) => s.gym.currentCycle);
  const sessions = useStore((s) => s.gym.sessions);
  const saveSession = useStore((s) => s.gym.saveSession);
  const userId = useStore((s) => s.userId);

  // Find existing session for this cycle+day if any
  const existingSession = sessions.find(
    (s) => s.cycleNumber === currentCycle && s.dayNumber === dayParam
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Initialize logs state — either from existing or fresh based on day
  const initialLogs = useMemo<ExerciseLog[]>(() => {
    if (existingSession) return existingSession.exercises;
    return day.groups.flatMap((g) =>
      g.exerciseIds.map((id) => ({
        exerciseId: id,
        sets: Array.from({ length: exercises[id].defaultSets }, () => ({})),
      }))
    );
  }, [day, existingSession]);

  const [logs, setLogs] = useState<ExerciseLog[]>(initialLogs);
  const [feeling, setFeeling] = useState<'great' | 'good' | 'tough' | 'rough' | undefined>(
    existingSession?.feeling
  );

  useEffect(() => {
    setLogs(initialLogs);
    setFeeling(existingSession?.feeling);
  }, [initialLogs, existingSession]);

  function updateSet(exerciseIdx: number, setIdx: number, field: 'weight' | 'reps' | 'duration', value: string) {
    setLogs((prev) => {
      const copy = prev.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })) }));
      const num = value === '' ? undefined : parseFloat(value);
      copy[exerciseIdx].sets[setIdx][field] = num;
      return copy;
    });
  }

  function addSet(exerciseIdx: number) {
    setLogs((prev) => {
      const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
      copy[exerciseIdx].sets.push({});
      return copy;
    });
  }

  function removeSet(exerciseIdx: number, setIdx: number) {
    setLogs((prev) => {
      const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
      if (copy[exerciseIdx].sets.length > 1) {
        copy[exerciseIdx].sets.splice(setIdx, 1);
      }
      return copy;
    });
  }

  function updateNotes(exerciseIdx: number, notes: string) {
    setLogs((prev) => {
      const copy = prev.map((l) => ({ ...l }));
      copy[exerciseIdx].notes = notes;
      return copy;
    });
  }

  function handleSave() {
    const session: SessionLog = {
      id: existingSession?.id ?? `${currentCycle}-${dayParam}-${Date.now()}`,
      cycleNumber: currentCycle,
      dayNumber: dayParam,
      date: existingSession?.date ?? new Date().toISOString(),
      exercises: logs,
      feeling,
    };
    saveSession(session);

    if (userId) {
      const supabase = createClient();
      const row = sessionToDb(session, userId);
      supabase.from('gym_sessions').upsert(row);
    }

    router.push('/gym?saved=1');
  }

  if (!mounted) return null;

  let exerciseIdxOffset = 0;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-36 md:pb-10">
        {/* Header */}
        <Link href="/gym" className="text-sm text-ink-tertiary hover:text-ink-primary mb-6 inline-flex items-center gap-1.5">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Gym
        </Link>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">
            Cycle {currentCycle} · Day {day.id}
          </p>
          <h1 className="display-font text-4xl sm:text-5xl font-medium text-ink-primary tracking-tightest mb-1">
            {day.name}
          </h1>
          <p className="text-ink-secondary">{day.subtitle}</p>
          {existingSession && (
            <p className="text-xs text-accent mt-2 mono-font">Editing existing log</p>
          )}
        </div>

        {/* Exercise blocks grouped by muscle */}
        {day.groups.map((group) => (
          <div key={group.label} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-1 h-6 bg-muscle-${group.muscleHue} rounded-full`} />
              <h2 className="text-xs uppercase tracking-widest text-ink-tertiary">{group.label}</h2>
            </div>

            {group.exerciseIds.map((exId) => {
              const ex = exercises[exId];
              const myIdx = exerciseIdxOffset++;
              const log = logs[myIdx];
              return (
                <ExerciseBlock
                  key={exId}
                  exercise={ex}
                  log={log}
                  exerciseIdx={myIdx}
                  onSetChange={updateSet}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                  onNotesChange={updateNotes}
                />
              );
            })}
          </div>
        ))}

        {/* How did it feel */}
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-ink-tertiary mb-3">How did it feel?</h2>
          <div className="flex flex-wrap gap-2">
            {(['great', 'good', 'tough', 'rough'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFeeling(f === feeling ? undefined : f)}
                className={`px-4 py-2 rounded-md text-sm border transition-colors capitalize ${
                  feeling === f
                    ? 'bg-accent text-bg-base border-accent'
                    : 'bg-bg-surface text-ink-secondary border-line hover:border-accent/40'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Save bar */}
        <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-0 bg-bg-base border-t border-line py-3 sm:py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 flex justify-end gap-3">
          <Link
            href="/gym"
            className="min-h-11 inline-flex items-center px-4 py-2.5 rounded-md text-sm text-ink-secondary border border-line hover:border-ink-tertiary transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            className="min-h-11 px-5 py-2.5 rounded-md text-sm bg-accent text-bg-base font-medium hover:bg-accent-dim transition-colors"
          >
            Save session
          </button>
        </div>
      </main>
    </div>
  );
}

function ExerciseBlock({
  exercise,
  log,
  exerciseIdx,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onNotesChange,
}: {
  exercise: typeof exercises[string];
  log: ExerciseLog;
  exerciseIdx: number;
  onSetChange: (exerciseIdx: number, setIdx: number, field: 'weight' | 'reps' | 'duration', value: string) => void;
  onAddSet: (exerciseIdx: number) => void;
  onRemoveSet: (exerciseIdx: number, setIdx: number) => void;
  onNotesChange: (exerciseIdx: number, notes: string) => void;
}) {
  const lastEntry = useLastEntry(exercise.id);
  const [showLast, setShowLast] = useState(false);

  return (
    <div className="bg-bg-surface border border-line rounded-lg sm:rounded-xl p-4 sm:p-5 mb-3">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <Link href={`/gym/exercise/${exercise.id}`} className="display-font text-lg text-ink-primary hover:text-accent transition-colors">
            {exercise.name}
          </Link>
          <p className="text-xs text-ink-tertiary mt-0.5 mono-font">
            target: {exercise.defaultSets}×{exercise.defaultReps ?? '—'}
          </p>
        </div>
        {lastEntry && (
          <button
            onClick={() => setShowLast(!showLast)}
            className="text-xs text-ink-tertiary hover:text-accent transition-colors uppercase tracking-wider"
          >
            {showLast ? 'hide' : 'last'}
          </button>
        )}
      </div>

      {showLast && lastEntry && (
        <div className="bg-bg-inset/50 rounded-md p-3 mb-3 text-xs mono-font">
          <p className="text-ink-tertiary mb-1.5 text-[10px] uppercase tracking-wider">Previous session</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {lastEntry.sets.map((set, i) => (
              <span key={i} className="text-ink-secondary">
                {set.weight !== undefined ? `${set.weight}kg×` : ''}
                {set.reps ?? set.duration ?? '—'}
                {set.duration !== undefined ? 's' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Set rows */}
      <div className="space-y-2">
        {log.sets.map((set, setIdx) => (
          <div key={setIdx} className="flex items-center gap-2">
            <span className="mono-font text-xs text-ink-tertiary w-7 sm:w-8 text-center shrink-0">
              {String(setIdx + 1).padStart(2, '0')}
            </span>

            {exercise.trackingType === 'weight-reps' && (
              <>
                <SetInput
                  value={set.weight}
                  onChange={(v) => onSetChange(exerciseIdx, setIdx, 'weight', v)}
                  unit="kg"
                  placeholder="0"
                />
                <span className="text-ink-tertiary">×</span>
                <SetInput
                  value={set.reps}
                  onChange={(v) => onSetChange(exerciseIdx, setIdx, 'reps', v)}
                  unit="reps"
                  placeholder="0"
                />
              </>
            )}

            {exercise.trackingType === 'bodyweight-reps' && (
              <SetInput
                value={set.reps}
                onChange={(v) => onSetChange(exerciseIdx, setIdx, 'reps', v)}
                unit="reps"
                placeholder="0"
                wide
              />
            )}

            {exercise.trackingType === 'time' && (
              <>
                <SetInput
                  value={set.weight}
                  onChange={(v) => onSetChange(exerciseIdx, setIdx, 'weight', v)}
                  unit="kg"
                  placeholder="0"
                />
                <span className="text-ink-tertiary">·</span>
                <SetInput
                  value={set.duration}
                  onChange={(v) => onSetChange(exerciseIdx, setIdx, 'duration', v)}
                  unit="sec"
                  placeholder="0"
                />
              </>
            )}

            {log.sets.length > 1 && (
              <button
                onClick={() => onRemoveSet(exerciseIdx, setIdx)}
                className="text-ink-faint hover:text-muscle-chest transition-colors p-2 -mr-1 shrink-0"
                aria-label="Remove set"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => onAddSet(exerciseIdx)}
        className="text-xs text-ink-tertiary hover:text-accent transition-colors mt-3 inline-flex items-center gap-1"
      >
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Add set
      </button>

      <input
        type="text"
        placeholder="Notes (optional)"
        value={log.notes ?? ''}
        onChange={(e) => onNotesChange(exerciseIdx, e.target.value)}
        className="mt-3 w-full text-xs px-3 py-2 bg-bg-inset/50 border border-line rounded-md text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors"
      />
    </div>
  );
}

function SetInput({
  value,
  onChange,
  unit,
  placeholder,
  wide,
}: {
  value: number | undefined;
  onChange: (v: string) => void;
  unit: string;
  placeholder: string;
  wide?: boolean;
}) {
  return (
    <div className={`flex items-center bg-bg-inset/70 border border-line rounded-md focus-within:border-accent/50 transition-colors min-w-0 ${wide ? 'flex-1' : 'w-20 sm:w-24'}`}>
      <input
        type="number"
        inputMode="decimal"
        step="0.5"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent px-2 sm:px-3 py-2.5 text-sm mono-font text-ink-primary placeholder-ink-faint focus:outline-none text-right"
      />
      <span className="text-[10px] uppercase tracking-wider text-ink-tertiary px-1.5 sm:px-2 shrink-0">{unit}</span>
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading...</div>}>
      <LogPageInner />
    </Suspense>
  );
}
