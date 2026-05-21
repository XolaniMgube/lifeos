'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { goalToDb } from '@/components/DataProvider';
import { createClient } from '@/lib/supabase';
import { Goal, GoalHorizon, GoalStatus, Task, TaskArea, useStore } from '@/store/useStore';

const AREAS: TaskArea[] = ['health', 'finance', 'growth', 'work', 'personal'];
const HORIZONS: GoalHorizon[] = ['quarter', 'year', 'long-term'];
const ACTIVE_STATUSES: GoalStatus[] = ['active', 'paused'];
const CLOSED_STATUSES: GoalStatus[] = ['done', 'dropped'];

function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatTarget(date?: string) {
  if (!date) return null;
  const today = localDate();
  const d = new Date(`${date}T12:00:00`);
  const diffMs = d.getTime() - new Date(`${today}T12:00:00`).getTime();
  const days = Math.round(diffMs / 86400000);

  if (days < 0) return { label: `${Math.abs(days)}d late`, urgent: true };
  if (days === 0) return { label: 'Today', urgent: true };
  if (days <= 7) return { label: `${days}d`, urgent: false };

  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    urgent: false,
  };
}

function linkedTasks(goalId: string, tasks: Task[]) {
  return tasks.filter((t) => t.goalId === goalId);
}

function taskProgress(goalId: string, tasks: Task[]) {
  const linked = linkedTasks(goalId, tasks);
  const actionable = linked.filter((t) => t.status !== 'cancelled');
  const done = actionable.filter((t) => t.status === 'done').length;
  const total = actionable.length;
  return { linked, done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function metricProgress(goal: Goal) {
  if (!goal.targetValue || goal.targetValue <= 0) return null;
  const current = goal.currentValue ?? 0;
  return Math.max(0, Math.min(100, Math.round((current / goal.targetValue) * 100)));
}

function groupGoals(goals: Goal[]) {
  const active = goals
    .filter((g) => ACTIVE_STATUSES.includes(g.status))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      if (a.targetDate) return -1;
      if (b.targetDate) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });

  const closed = goals
    .filter((g) => CLOSED_STATUSES.includes(g.status))
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));

  return [
    { key: 'active', label: 'In play', goals: active },
    { key: 'closed', label: 'Closed', goals: closed },
  ].filter((g) => g.goals.length > 0);
}

export default function GoalsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const goals = useStore((s) => s.goals.goals);
  const tasks = useStore((s) => s.tasks.tasks);
  const storeAdd = useStore((s) => s.goals.addGoal);
  const storeUpdate = useStore((s) => s.goals.updateGoal);
  const storeDelete = useStore((s) => s.goals.deleteGoal);
  const userId = useStore((s) => s.userId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState('');
  const [addHorizon, setAddHorizon] = useState<GoalHorizon>('quarter');
  const [addArea, setAddArea] = useState<TaskArea | undefined>(undefined);

  const groups = useMemo(() => groupGoals(goals), [goals]);
  const activeGoals = goals.filter((g) => g.status === 'active');
  const linkedOpenTasks = tasks.filter(
    (t) => t.goalId && t.status === 'open' && activeGoals.some((g) => g.id === t.goalId)
  ).length;

  function handleAdd() {
    const title = addTitle.trim();
    if (!title) return;

    const goal: Goal = {
      id: `goal-${Date.now()}`,
      title,
      status: 'active',
      horizon: addHorizon,
      area: addArea,
      createdAt: new Date().toISOString(),
    };

    storeAdd(goal);

    if (userId) {
      createClient().from('goals').insert(goalToDb(goal, userId));
    }

    setAddTitle('');
    setAddHorizon('quarter');
    setAddArea(undefined);
  }

  function handleUpdate(id: string, patch: Partial<Goal>) {
    storeUpdate(id, patch);

    if (userId) {
      const updated = useStore.getState().goals.goals.find((g) => g.id === id);
      if (updated) {
        createClient().from('goals').update(goalToDb(updated, userId)).eq('id', id);
      }
    }
  }

  function handleDelete(id: string) {
    storeDelete(id);

    if (userId) {
      const supabase = createClient();
      supabase.from('tasks').update({ goal_id: null }).eq('goal_id', id);
      supabase.from('goals').delete().eq('id', id);
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-56 md:pb-36">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">Module · Goals</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="display-font text-4xl sm:text-5xl font-medium text-ink-primary tracking-tightest">
                Goals
              </h1>
              <p className="text-sm text-ink-secondary mt-3 max-w-xl">
                Name the outcome, attach the work, and keep the next decision visible.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="display-font text-3xl text-accent">{activeGoals.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-ink-tertiary">active</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
          <StatPill label="Open work" value={`${linkedOpenTasks}`} />
          <StatPill label="Completed" value={`${goals.filter((g) => g.status === 'done').length}`} />
          <StatPill label="Paused" value={`${goals.filter((g) => g.status === 'paused').length}`} />
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-ink-faint text-sm mb-1">No goals yet.</p>
            <p className="text-ink-faint text-xs">Add one below, then link tasks to it.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <GoalGroup
                key={group.key}
                label={group.label}
                goals={group.goals}
                tasks={tasks}
                expandedId={expandedId}
                onExpand={setExpandedId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 bg-bg-surface border-t border-line z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="What outcome are you committing to?"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 min-w-0 bg-bg-inset border border-line rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!addTitle.trim()}
              className="px-4 py-3 rounded-lg bg-accent text-bg-base text-sm font-medium disabled:opacity-30 hover:bg-accent-dim transition-colors shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {HORIZONS.map((horizon) => (
              <button
                key={horizon}
                onClick={() => setAddHorizon(horizon)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize whitespace-nowrap ${
                  addHorizon === horizon
                    ? 'bg-accent text-bg-base border-accent'
                    : 'text-ink-tertiary border-line hover:border-accent/30'
                }`}
              >
                {horizon}
              </button>
            ))}
            <div className="w-px h-5 bg-line shrink-0" />
            {AREAS.map((area) => (
              <button
                key={area}
                onClick={() => setAddArea((current) => (current === area ? undefined : area))}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize whitespace-nowrap ${
                  addArea === area
                    ? 'bg-bg-inset border-accent/40 text-accent'
                    : 'text-ink-tertiary border-line hover:border-accent/30'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalGroup({
  label,
  goals,
  tasks,
  expandedId,
  onExpand,
  onUpdate,
  onDelete,
}: {
  label: string;
  goals: Goal[];
  tasks: Task[];
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Goal>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-widest text-ink-tertiary">{label}</h2>
        <span className="mono-font text-xs text-ink-faint">{goals.length}</span>
        <div className="flex-1 h-px bg-line" />
      </div>
      <div className="space-y-2">
        {goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            tasks={tasks}
            expanded={expandedId === goal.id}
            onExpand={() => onExpand(expandedId === goal.id ? null : goal.id)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

function GoalRow({
  goal,
  tasks,
  expanded,
  onExpand,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  tasks: Task[];
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (id: string, patch: Partial<Goal>) => void;
  onDelete: (id: string) => void;
}) {
  const target = formatTarget(goal.targetDate);
  const metric = metricProgress(goal);
  const progress = taskProgress(goal.id, tasks);
  const linked = progress.linked.slice(0, 4);
  const isClosed = CLOSED_STATUSES.includes(goal.status);

  return (
    <div
      className={`rounded-lg border transition-all ${
        expanded ? 'bg-bg-surface border-accent/30' : 'bg-bg-surface border-line'
      }`}
    >
      <button onClick={onExpand} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <StatusMark status={goal.status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className={`text-sm sm:text-base font-medium truncate ${
                    isClosed ? 'text-ink-faint line-through' : 'text-ink-primary'
                  }`}
                >
                  {goal.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  <span className="text-[10px] uppercase tracking-wider text-ink-tertiary">
                    {goal.horizon}
                  </span>
                  {goal.area && (
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint">
                      {goal.area}
                    </span>
                  )}
                  {target && (
                    <span
                      className={`text-[11px] mono-font ${
                        target.urgent ? 'text-muscle-chest' : 'text-ink-faint'
                      }`}
                    >
                      {target.label}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-right shrink-0">
                <span className="block mono-font text-sm text-ink-secondary">
                  {metric ?? progress.percent}%
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-ink-faint">
                  {metric === null ? 'tasks' : 'metric'}
                </span>
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-bg-inset overflow-hidden mt-4">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${metric ?? progress.percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 mt-3">
              <p className="text-xs text-ink-tertiary truncate">
                {goal.metricLabel && goal.targetValue
                  ? `${goal.currentValue ?? 0} / ${goal.targetValue} ${goal.metricLabel}`
                  : progress.total
                  ? `${progress.done} of ${progress.total} linked tasks done`
                  : 'No linked tasks yet'}
              </p>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`shrink-0 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-line pt-4 space-y-4">
          <input
            type="text"
            value={goal.title}
            onChange={(e) => onUpdate(goal.id, { title: e.target.value })}
            className="w-full text-sm px-3 py-2.5 bg-bg-inset/60 border border-line rounded-md text-ink-primary focus:outline-none focus:border-accent/50 transition-colors"
          />

          <textarea
            placeholder="Why this matters..."
            value={goal.why ?? ''}
            onChange={(e) => onUpdate(goal.id, { why: e.target.value || undefined })}
            rows={2}
            className="w-full text-sm px-3 py-2.5 bg-bg-inset/60 border border-line rounded-md text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Target">
              <input
                type="date"
                value={goal.targetDate ?? ''}
                onChange={(e) => onUpdate(goal.id, { targetDate: e.target.value || undefined })}
                className="w-full text-sm bg-bg-inset/60 border border-line rounded-md px-3 py-2 text-ink-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </Field>
            <Field label="Horizon">
              <div className="flex gap-1.5 flex-wrap">
                {HORIZONS.map((horizon) => (
                  <Chip
                    key={horizon}
                    label={horizon}
                    active={goal.horizon === horizon}
                    onClick={() => onUpdate(goal.id, { horizon })}
                  />
                ))}
              </div>
            </Field>
          </div>

          <Field label="Area">
            <div className="flex gap-1.5 flex-wrap">
              {AREAS.map((area) => (
                <Chip
                  key={area}
                  label={area}
                  active={goal.area === area}
                  onClick={() => onUpdate(goal.id, { area: goal.area === area ? undefined : area })}
                />
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_92px_92px] gap-2">
            <input
              type="text"
              placeholder="Metric"
              value={goal.metricLabel ?? ''}
              onChange={(e) => onUpdate(goal.id, { metricLabel: e.target.value || undefined })}
              className="min-w-0 text-sm px-3 py-2 bg-bg-inset/60 border border-line rounded-md text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors"
            />
            <input
              type="number"
              placeholder="Now"
              value={goal.currentValue ?? ''}
              onChange={(e) =>
                onUpdate(goal.id, {
                  currentValue: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className="min-w-0 text-sm px-3 py-2 bg-bg-inset/60 border border-line rounded-md text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors"
            />
            <input
              type="number"
              placeholder="Goal"
              value={goal.targetValue ?? ''}
              onChange={(e) =>
                onUpdate(goal.id, {
                  targetValue: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className="min-w-0 text-sm px-3 py-2 bg-bg-inset/60 border border-line rounded-md text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <textarea
            placeholder="Notes..."
            value={goal.notes ?? ''}
            onChange={(e) => onUpdate(goal.id, { notes: e.target.value || undefined })}
            rows={2}
            className="w-full text-sm px-3 py-2.5 bg-bg-inset/60 border border-line rounded-md text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-ink-tertiary">Linked tasks</p>
              <Link href="/tasks" className="text-xs text-ink-tertiary hover:text-accent transition-colors">
                Manage →
              </Link>
            </div>
            {linked.length > 0 ? (
              <div className="space-y-1">
                {linked.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs text-ink-secondary">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        task.status === 'done'
                          ? 'bg-accent'
                          : task.status === 'cancelled'
                          ? 'bg-ink-faint'
                          : 'bg-ink-tertiary'
                      }`}
                    />
                    <span className={task.status === 'done' ? 'line-through text-ink-faint' : ''}>
                      {task.title}
                    </span>
                  </div>
                ))}
                {progress.linked.length > linked.length && (
                  <p className="text-xs text-ink-faint">+{progress.linked.length - linked.length} more</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-ink-faint">Attach tasks from the task editor.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(['active', 'paused', 'done', 'dropped'] as GoalStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => onUpdate(goal.id, { status })}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${
                  goal.status === status
                    ? 'bg-accent text-bg-base border-accent'
                    : 'text-ink-tertiary border-line hover:border-accent/30'
                }`}
              >
                {status}
              </button>
            ))}
            <button
              onClick={() => onDelete(goal.id)}
              className="text-xs text-ink-faint hover:text-muscle-chest border border-line rounded-md px-3 py-1.5 transition-colors ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusMark({ status }: { status: GoalStatus }) {
  const color =
    status === 'active'
      ? 'bg-accent'
      : status === 'paused'
      ? 'bg-muscle-legs'
      : status === 'done'
      ? 'bg-muscle-back'
      : 'bg-ink-faint';

  return <span className={`w-2 h-2 rounded-full ${color} mt-2 shrink-0`} />;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-surface border border-line rounded-lg p-3">
      <p className="display-font text-2xl text-ink-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-ink-tertiary">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-ink-tertiary mb-2">{label}</p>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs border transition-colors capitalize ${
        active
          ? 'bg-bg-inset border-accent/40 text-accent'
          : 'text-ink-tertiary border-line hover:border-accent/30'
      }`}
    >
      {label}
    </button>
  );
}
