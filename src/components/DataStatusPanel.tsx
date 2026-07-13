'use client';

export function DataStatusPanel({
  status,
  error,
}: {
  status: 'loading' | 'ready' | 'error';
  error?: string | null;
}) {
  if (status === 'ready') return null;

  if (status === 'error') {
    return (
      <div role="alert" className="rounded-2xl border border-muscle-chest/30 bg-muscle-chest/5 px-5 py-5">
        <p className="text-sm font-medium text-ink-primary">Tasks could not be loaded.</p>
        <p className="mt-1 text-xs text-ink-tertiary">{error || 'Check your connection and try again.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:border-accent/40 hover:text-accent"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div role="status" aria-label="Loading tasks" className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-14 animate-pulse rounded-xl border border-line bg-bg-surface/55" />
      ))}
    </div>
  );
}
