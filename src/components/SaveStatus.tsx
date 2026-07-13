import type { SaveState } from '@/hooks/useSaveStatus';

export function SaveStatus({
  state,
  message,
  onRetry,
}: {
  state: SaveState;
  message?: string;
  onRetry?: () => void;
}) {
  if (state === 'idle') return null;

  return (
    <div
      role={state === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border px-3.5 py-2 text-xs shadow-lg backdrop-blur md:right-6 md:top-6 ${
        state === 'error'
          ? 'border-muscle-chest/35 bg-bg-raised text-muscle-chest'
          : 'border-line bg-bg-raised/95 text-ink-secondary'
      }`}
    >
      {state === 'saving' && <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />}
      {state === 'saved' && <span className="text-accent">✓</span>}
      {state === 'error' && <span>!</span>}
      <span className="max-w-64 truncate">
        {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : message || 'Not saved'}
      </span>
      {state === 'error' && onRetry && (
        <button onClick={onRetry} className="font-medium text-ink-primary underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}
