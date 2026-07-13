'use client';

import { useCallback, useRef, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type MutationResult = { error: { message: string } | null };
type Mutation = () => Promise<MutationResult>;

export function useSaveStatus() {
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const retryRef = useRef<Mutation | null>(null);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const execute = useCallback(async (mutation: Mutation) => {
    retryRef.current = mutation;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setState('saving');
    setMessage('');

    try {
      const { error } = await mutation();
      if (error) throw error;

      retryRef.current = null;
      setState('saved');
      resetTimerRef.current = setTimeout(() => setState('idle'), 1800);
      return true;
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error && 'message' in error
            ? String(error.message)
            : 'Could not save your change.';
      setMessage(detail);
      setState('error');
      return false;
    }
  }, []);

  const run = useCallback((mutation: Mutation) => execute(mutation), [execute]);

  const schedule = useCallback(
    (key: string, mutation: Mutation, delay = 500) => {
      const existing = timersRef.current.get(key);
      if (existing) clearTimeout(existing);

      retryRef.current = mutation;
      setState('saving');
      setMessage('');
      const timer = setTimeout(() => {
        timersRef.current.delete(key);
        void execute(mutation);
      }, delay);
      timersRef.current.set(key, timer);
    },
    [execute]
  );

  const retry = useCallback(() => {
    if (retryRef.current) void execute(retryRef.current);
  }, [execute]);

  return { state, message, run, schedule, retry };
}
