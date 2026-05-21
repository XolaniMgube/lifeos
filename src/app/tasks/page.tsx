'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useStore, Task, TaskPriority, TaskArea } from '@/store/useStore';
import { createClient } from '@/lib/supabase';
import { taskToDb } from '@/components/DataProvider';

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

function groupTasks(tasks: Task[]): Group[] {
  const today = localDate();
  const week = localDate(7);

  const buckets: Record<string, Task[]> = { today: [], week: [], later: [], none: [] };

  for (const t of tasks) {
    if (!t.dueDate) buckets.none.push(t);
    else if (t.dueDate <= today) buckets.today.push(t);
    else if (t.dueDate <= week) buckets.week.push(t);
    else buckets.later.push(t);
  }

  const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  const sort = (arr: Task[]) => [
    ...arr
      .filter((t) => t.status === 'open')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]),
    ...arr.filter((t) => t.status !== 'open'),
  ];

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
  const storeAdd = useStore((s) => s.tasks.addTask);
  const storeUpdate = useStore((s) => s.tasks.updateTask);
  const storeDelete = useStore((s) => s.tasks.deleteTask);
  const userId = useStore((s) => s.userId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState('');
  const [addDue, setAddDue] = useState<string | undefined>(undefined);
  const [addPriority, setAddPriority] = useState<TaskPriority>('medium');

  function handleAdd() {
    const title = addTitle.trim();
    if (!title) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title,
      status: 'open',
      priority: addPriority,
      dueDate: addDue,
      createdAt: new Date().toISOString(),
    };

    storeAdd(task);

    if (userId) {
      createClient().from('tasks').insert(taskToDb(task, userId));
    }

    setAddTitle('');
    setAddDue(undefined);
    setAddPriority('medium');
  }

  function handleUpdate(id: string, patch: Partial<Task>) {
    storeUpdate(id, patch);

    if (userId) {
      const updated = useStore.getState().tasks.tasks.find((t) => t.id === id);
      if (updated) {
        const row = taskToDb({ ...updated, ...patch }, userId);
        createClient().from('tasks').update(row).eq('id', id);
      }
    }
  }

  function handleDelete(id: string) {
    storeDelete(id);
    if (userId) {
      createClient().from('tasks').delete().eq('id', id);
    }
  }

  const groups = mounted ? groupTasks(tasks) : [];
  const openCount = tasks.filter((t) => t.status === 'open').length;

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-8 py-8 pb-36">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">Module · Tasks</p>
          <div className="flex items-baseline justify-between">
            <h1 className="display-font text-4xl font-medium text-ink-primary tracking-tightest">
              Tasks
            </h1>
            {openCount > 0 && (
              <span className="mono-font text-sm text-ink-tertiary">{openCount} open</span>
            )}
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-ink-faint text-sm mb-1">No tasks.</p>
            <p className="text-ink-faint text-xs">Add one below to get started.</p>
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
              />
            ))}
          </div>
        )}
      </main>

      {/* Sticky bottom quick-add */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-line z-10">
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
              disabled={!addTitle.trim()}
              className="px-4 py-3 rounded-lg bg-accent text-bg-base text-sm font-medium disabled:opacity-30 hover:bg-accent-dim transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex items-center gap-2">
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

function TaskGroup({
  group,
  expandedId,
  onExpand,
  onUpdate,
  onDelete,
}: {
  group: Group;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
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
}: {
  task: Task;
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const isDone = task.status === 'done';
  const isCancelled = task.status === 'cancelled';
  const isInactive = isDone || isCancelled;
  const due = task.dueDate ? formatDue(task.dueDate) : null;

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

          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-ink-tertiary w-16 shrink-0">
              Priority
            </span>
            <div className="flex gap-1.5">
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
