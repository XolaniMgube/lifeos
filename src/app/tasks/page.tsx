'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useStore, Task, TaskPriority, TaskArea, Goal } from '@/store/useStore';
import { createClient } from '@/lib/supabase';
import { taskToDb } from '@/components/DataProvider';
import { SaveStatus } from '@/components/SaveStatus';
import { useSaveStatus } from '@/hooks/useSaveStatus';
import { features } from '@/config/features';

// ── Date helpers (local time, no UTC shift) ──────────────────────────────────

function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDue(dueDate: string): { label: string; overdue: boolean } {
  const today = localDate();
  const tomorrow = localDate(1);
  if (dueDate < today) {
    const diffMs =
      new Date(`${today}T12:00:00`).getTime() - new Date(`${dueDate}T12:00:00`).getTime();
    const days = Math.round(diffMs / 86400000);
    return { label: `${days}d overdue`, overdue: true };
  }
  if (dueDate === today) return { label: 'Today', overdue: false };
  if (dueDate === tomorrow) return { label: 'Tomorrow', overdue: false };
  const diffMs =
    new Date(`${dueDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime();
  const diffDays = Math.round(diffMs / 86400000);
  const d = new Date(`${dueDate}T12:00:00`);
  if (diffDays <= 6) {
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), overdue: false };
  }
  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overdue: false,
  };
}

// ── Grouping ─────────────────────────────────────────────────────────────────

type Group = { key: string; label: string; tasks: Task[] };
type TaskView = 'open' | 'today' | 'upcoming' | 'completed';

function groupTasks(tasks: Task[], view: TaskView): Group[] {
  const today = localDate();
  const week = localDate(7);

  if (view === 'completed') {
    const completed = tasks
      .filter((task) => task.status === 'done')
      .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
    const cancelled = tasks
      .filter((task) => task.status === 'cancelled')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return [
      { key: 'completed', label: 'Completed', tasks: completed },
      { key: 'cancelled', label: 'Not doing', tasks: cancelled },
    ].filter((group) => group.tasks.length > 0);
  }

  const open = tasks.filter((task) => {
    if (task.status !== 'open') return false;
    if (view === 'today') return Boolean(task.dueDate && task.dueDate <= today);
    if (view === 'upcoming') return Boolean(task.dueDate && task.dueDate > today);
    return true;
  });

  const buckets: Record<string, Task[]> = { today: [], week: [], later: [], none: [] };

  for (const t of open) {
    if (!t.dueDate) buckets.none.push(t);
    else if (t.dueDate <= today) buckets.today.push(t);
    else if (t.dueDate <= week) buckets.week.push(t);
    else buckets.later.push(t);
  }

  const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  const sort = (arr: Task[]) => [...arr].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
  );

  return [
    { key: 'today', label: 'Today', tasks: sort(buckets.today) },
    { key: 'week', label: 'This week', tasks: sort(buckets.week) },
    { key: 'later', label: 'Later', tasks: sort(buckets.later) },
    { key: 'none', label: 'No date', tasks: sort(buckets.none) },
  ].filter((g) => g.tasks.length > 0);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tasks = useStore((s) => s.tasks.tasks);
  const goals = useStore((s) => s.goals.goals);
  const storeAdd = useStore((s) => s.tasks.addTask);
  const storeUpdate = useStore((s) => s.tasks.updateTask);
  const storeDelete = useStore((s) => s.tasks.deleteTask);
  const userId = useStore((s) => s.userId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState('');
  const [addDue, setAddDue] = useState<string | undefined>(undefined);
  const [addPriority, setAddPriority] = useState<TaskPriority>('medium');
  const [view, setView] = useState<TaskView>('open');
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const save = useSaveStatus();

  function reportExpiredSession() {
    void save.run(async () => ({ error: { message: 'Your session expired. Sign in again.' } }));
  }

  async function handleAdd() {
    const title = addTitle.trim();
    if (!title || save.state === 'saving') return;
    if (!userId) return reportExpiredSession();

    const task: Task = {
      id: crypto.randomUUID(),
      title,
      status: 'open',
      priority: addPriority,
      dueDate: addDue,
      createdAt: new Date().toISOString(),
    };

    await save.run(async () => {
      const result = await createClient()
        .from('tasks')
        .upsert(taskToDb(task, userId))
        .select('id')
        .single();
      if (!result.error) {
        storeAdd(task);
        setAddTitle('');
        setAddDue(undefined);
        setAddPriority('medium');
        setView(task.dueDate === localDate() ? 'today' : 'open');
      }
      return result;
    });
  }

  function handleUpdate(id: string, patch: Partial<Task>) {
    if (!userId) return reportExpiredSession();
    storeUpdate(id, patch);

    const updated = useStore.getState().tasks.tasks.find((task) => task.id === id);
    if (updated) {
      const row = taskToDb(updated, userId);
      save.schedule(`task:${id}`, async () =>
        await createClient()
          .from('tasks')
          .update(row)
          .eq('id', id)
          .eq('user_id', userId)
          .select('id')
          .single()
      );
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return reportExpiredSession();
    await save.run(async () => {
      const result = await createClient()
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single();
      if (!result.error) storeDelete(id);
      return result;
    });
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesQuery = !normalizedQuery
      || task.title.toLowerCase().includes(normalizedQuery)
      || task.notes?.toLowerCase().includes(normalizedQuery);
    return matchesPriority && matchesQuery;
  });
  const groups = mounted ? groupTasks(filteredTasks, view) : [];
  const openCount = tasks.filter((t) => t.status === 'open').length;
  const todayCount = tasks.filter(
    (task) => task.status === 'open' && task.dueDate && task.dueDate <= localDate()
  ).length;
  const upcomingCount = tasks.filter(
    (task) => task.status === 'open' && task.dueDate && task.dueDate > localDate()
  ).length;
  const completedCount = tasks.filter((task) => task.status !== 'open').length;

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <SaveStatus state={save.state} message={save.message} onRetry={save.retry} />
      <Sidebar />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-8 py-8 pb-56 md:pb-36">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">Module · Tasks</p>
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="display-font text-4xl font-medium text-ink-primary tracking-tightest">
              Tasks
            </h1>
            {openCount > 0 && (
              <span className="mono-font text-sm text-ink-tertiary">{openCount} open</span>
            )}
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-bg-surface/65 p-1">
            <ViewTab label="Open" count={openCount} active={view === 'open'} onClick={() => setView('open')} />
            <ViewTab label="Today" count={todayCount} active={view === 'today'} onClick={() => setView('today')} />
            <ViewTab label="Upcoming" count={upcomingCount} active={view === 'upcoming'} onClick={() => setView('upcoming')} />
            <ViewTab label="Completed" count={completedCount} active={view === 'completed'} onClick={() => setView('completed')} />
          </div>
          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3 focus-within:border-accent/40">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tasks"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none"
              />
            </label>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | 'all')}
              aria-label="Filter by priority"
              className="rounded-lg border border-line bg-bg-surface px-3 text-xs text-ink-secondary focus:border-accent/40 focus:outline-none"
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-ink-tertiary text-sm mb-1">
              {query || priorityFilter !== 'all' ? 'No matching tasks.' : `No ${view} tasks.`}
            </p>
            <p className="text-ink-faint text-xs">
              {view === 'completed' ? 'Completed tasks will appear here.' : 'Add one below when you are ready.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <TaskGroup
                key={group.key}
                group={group}
                expandedId={expandedId}
                onExpand={setExpandedId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                goals={goals}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sticky bottom quick-add */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 bg-bg-surface border-t border-line z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 bg-bg-inset border border-line rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!addTitle.trim() || save.state === 'saving'}
              className="px-4 py-3 rounded-lg bg-accent text-bg-base text-sm font-medium disabled:opacity-30 hover:bg-accent-dim transition-colors shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <DueChip
              label="Today"
              active={addDue === localDate()}
              onToggle={() => setAddDue((d) => (d === localDate() ? undefined : localDate()))}
            />
            <DueChip
              label="Tomorrow"
              active={addDue === localDate(1)}
              onToggle={() => setAddDue((d) => (d === localDate(1) ? undefined : localDate(1)))}
            />
            <PriorityChip priority={addPriority} onChange={setAddPriority} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ViewTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
        active
          ? 'bg-bg-inset text-ink-primary shadow-sm'
          : 'text-ink-tertiary hover:text-ink-primary'
      }`}
    >
      {label}
      <span className={`mono-font text-[10px] ${active ? 'text-accent' : 'text-ink-faint'}`}>{count}</span>
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-ink-faint">
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" strokeLinecap="round" />
    </svg>
  );
}

function TaskGroup({
  group,
  expandedId,
  onExpand,
  onUpdate,
  onDelete,
  goals,
}: {
  group: Group;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  goals: Goal[];
}) {
  const openCount = group.tasks.filter((t) => t.status === 'open').length;
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-xs uppercase tracking-widest text-ink-tertiary">{group.label}</h2>
        {openCount > 0 && <span className="mono-font text-xs text-ink-faint">{openCount}</span>}
        <div className="flex-1 h-px bg-line" />
      </div>
      <div className="space-y-1">
        {group.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            expanded={expandedId === task.id}
            onExpand={() => onExpand(expandedId === task.id ? null : task.id)}
            onUpdate={onUpdate}
            onDelete={onDelete}
            goals={goals}
          />
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  expanded,
  onExpand,
  onUpdate,
  onDelete,
  goals,
}: {
  task: Task;
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  goals: Goal[];
}) {
  const isDone = task.status === 'done';
  const isCancelled = task.status === 'cancelled';
  const isInactive = isDone || isCancelled;
  const due = task.dueDate ? formatDue(task.dueDate) : null;
  const linkedGoal = task.goalId ? goals.find((g) => g.id === task.goalId) : undefined;
  const selectableGoals = goals.filter((g) => g.status === 'active' || g.status === 'paused');
  const goalOptions =
    linkedGoal && !selectableGoals.some((g) => g.id === linkedGoal.id)
      ? [linkedGoal, ...selectableGoals]
      : selectableGoals;

  return (
    <div
      className={`rounded-lg border transition-all ${
        expanded ? 'bg-bg-surface border-accent/30' : 'bg-bg-surface border-line'
      }`}
    >
      <div className="flex items-center min-h-[52px]">
        {/* Checkbox — large touch target */}
        <button
          onClick={() => onUpdate(task.id, { status: isDone ? 'open' : 'done' })}
          className="flex items-center justify-center w-12 h-12 shrink-0 transition-colors text-ink-faint hover:text-accent"
          aria-label={isDone ? 'Mark open' : 'Complete task'}
        >
          {isDone ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" stroke="rgb(var(--accent))" />
              <path
                d="M8 12l3 3 5-5"
                stroke="rgb(var(--accent))"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : isCancelled ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </button>

        {/* Title + meta — tap to expand */}
        <button
          onClick={onExpand}
          className="flex-1 flex items-center gap-2 py-3 pr-4 text-left min-w-0"
        >
          {task.priority === 'high' && !isInactive && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          )}
          <span
            className={`text-sm flex-1 min-w-0 truncate transition-colors ${
              isDone
                ? 'line-through text-ink-faint'
                : isCancelled
                ? 'line-through text-ink-faint opacity-50'
                : 'text-ink-primary'
            }`}
          >
            {task.title}
          </span>
          {task.area && !isInactive && (
            <span className="text-[10px] uppercase tracking-wider text-ink-faint shrink-0 hidden sm:inline">
              {task.area}
            </span>
          )}
          {linkedGoal && !isInactive && (
            <span className="text-[10px] uppercase tracking-wider text-accent shrink-0 hidden sm:inline max-w-[120px] truncate">
              {linkedGoal.title}
            </span>
          )}
          {due && (
            <span
              className={`text-[11px] mono-font shrink-0 ${
                due.overdue ? 'text-muscle-chest' : 'text-ink-faint'
              }`}
            >
              {due.label}
            </span>
          )}
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
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-line pt-3 space-y-3">
          <input
            type="text"
            value={task.title}
            onChange={(e) => onUpdate(task.id, { title: e.target.value })}
            className="w-full text-sm px-3 py-2.5 bg-bg-inset/60 border border-line rounded-md text-ink-primary focus:outline-none focus:border-accent/50 transition-colors"
          />

          <textarea
            placeholder="Notes..."
            value={task.notes ?? ''}
            onChange={(e) => onUpdate(task.id, { notes: e.target.value || undefined })}
            rows={2}
            className="w-full text-sm px-3 py-2.5 bg-bg-inset/60 border border-line rounded-md text-ink-primary placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />

          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-ink-tertiary w-16 shrink-0">
              Due
            </span>
            <input
              type="date"
              value={task.dueDate ?? ''}
              onChange={(e) => onUpdate(task.id, { dueDate: e.target.value || undefined })}
              className="text-sm bg-bg-inset/60 border border-line rounded-md px-3 py-1.5 text-ink-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
            {task.dueDate && (
              <button
                onClick={() => onUpdate(task.id, { dueDate: undefined })}
                className="text-xs text-ink-faint hover:text-ink-secondary transition-colors"
              >
                clear
              </button>
            )}
          </div>

          <div className="flex items-start gap-3">
            <span className="text-xs uppercase tracking-wider text-ink-tertiary w-16 shrink-0">
              Priority
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onUpdate(task.id, { priority: p })}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors capitalize ${
                    task.priority === p
                      ? 'bg-accent text-bg-base border-accent'
                      : 'text-ink-secondary border-line hover:border-accent/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-xs uppercase tracking-wider text-ink-tertiary w-16 shrink-0 pt-1.5">
              Area
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {(['health', 'finance', 'growth', 'work', 'personal'] as TaskArea[]).map((a) => (
                <button
                  key={a}
                  onClick={() => onUpdate(task.id, { area: task.area === a ? undefined : a })}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors capitalize ${
                    task.area === a
                      ? 'bg-bg-inset border-accent/40 text-accent'
                      : 'text-ink-tertiary border-line hover:border-accent/30'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {features.goals && (
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-ink-tertiary w-16 shrink-0">
                Goal
              </span>
              <select
                value={task.goalId ?? ''}
                onChange={(e) => onUpdate(task.id, { goalId: e.target.value || undefined })}
                className="flex-1 min-w-0 text-sm bg-bg-inset/60 border border-line rounded-md px-3 py-2 text-ink-primary focus:outline-none focus:border-accent/50 transition-colors"
              >
                <option value="">No goal</option>
                {goalOptions.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                onUpdate(task.id, { status: isCancelled ? 'open' : 'cancelled' });
                onExpand();
              }}
              className="text-xs text-ink-tertiary hover:text-ink-secondary border border-line rounded-md px-3 py-1.5 transition-colors"
            >
              {isCancelled ? 'Reopen' : "Won't do"}
            </button>
            <button
              onClick={() => onDelete(task.id)}
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

function DueChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
        active
          ? 'bg-accent text-bg-base border-accent'
          : 'text-ink-tertiary border-line hover:border-accent/30'
      }`}
    >
      {label}
    </button>
  );
}

const PRIORITY_CYCLE: Record<TaskPriority, TaskPriority> = {
  low: 'medium',
  medium: 'high',
  high: 'low',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: '↓ low',
  medium: '— med',
  high: '↑ high',
};

function PriorityChip({
  priority,
  onChange,
}: {
  priority: TaskPriority;
  onChange: (p: TaskPriority) => void;
}) {
  return (
    <button
      onClick={() => onChange(PRIORITY_CYCLE[priority])}
      className={`text-xs px-3 py-1.5 rounded-md border border-line hover:border-accent/30 transition-colors mono-font ${
        priority === 'high'
          ? 'text-accent'
          : priority === 'low'
          ? 'text-ink-faint'
          : 'text-ink-tertiary'
      }`}
    >
      {PRIORITY_LABEL[priority]}
    </button>
  );
}
