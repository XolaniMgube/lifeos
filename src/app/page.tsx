'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { SaveStatus } from '@/components/SaveStatus';
import { taskToDb } from '@/components/DataProvider';
import { useSaveStatus } from '@/hooks/useSaveStatus';
import { createClient } from '@/lib/supabase';
import { Task, useStore } from '@/store/useStore';

function localDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  useEffect(() => setMounted(true), []);

  const tasks = useStore((state) => state.tasks.tasks);
  const addTask = useStore((state) => state.tasks.addTask);
  const updateTask = useStore((state) => state.tasks.updateTask);
  const userId = useStore((state) => state.userId);
  const save = useSaveStatus();
  const today = new Date();
  const todayKey = localDate(today);

  const taskSummary = useMemo(() => {
    const open = tasks.filter((task) => task.status === 'open');
    const due = open
      .filter((task) => task.dueDate && task.dueDate <= todayKey)
      .sort(sortTasks);
    const fallback = open.filter((task) => !due.includes(task)).sort(sortTasks);
    const completedToday = tasks.filter(
      (task) => task.status === 'done' && task.completedAt?.slice(0, 10) === todayKey
    ).length;

    return {
      focus: [...due, ...fallback].slice(0, 3),
      completedToday,
      dueToday: due.length,
      open: open.length,
      upcoming: open.filter((task) => task.dueDate && task.dueDate > todayKey).length,
    };
  }, [tasks, todayKey]);

  if (!mounted) return null;

  const focusTotal = taskSummary.focus.length + taskSummary.completedToday;
  const progress = focusTotal
    ? Math.round((taskSummary.completedToday / focusTotal) * 100)
    : 0;

  function reportExpiredSession() {
    void save.run(async () => ({ error: { message: 'Your session expired. Sign in again.' } }));
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const title = addTitle.trim();
    if (!title || save.state === 'saving') return;
    if (!userId) return reportExpiredSession();

    const task: Task = {
      id: crypto.randomUUID(),
      title,
      status: 'open',
      priority: 'medium',
      dueDate: todayKey,
      createdAt: new Date().toISOString(),
    };

    await save.run(async () => {
      const result = await createClient()
        .from('tasks')
        .upsert(taskToDb(task, userId))
        .select('id')
        .single();
      if (!result.error) {
        addTask(task);
        setAddTitle('');
      }
      return result;
    });
  }

  async function handleComplete(task: Task) {
    if (save.state === 'saving') return;
    if (!userId) return reportExpiredSession();

    const completed: Task = {
      ...task,
      status: 'done',
      completedAt: new Date().toISOString(),
    };

    await save.run(async () => {
      const result = await createClient()
        .from('tasks')
        .update(taskToDb(completed, userId))
        .eq('id', task.id)
        .eq('user_id', userId)
        .select('id')
        .single();
      if (!result.error) updateTask(task.id, { status: 'done', completedAt: completed.completedAt });
      return result;
    });
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      <SaveStatus state={save.state} message={save.message} onRetry={save.retry} />
      <Sidebar />

      <main className="relative flex-1 overflow-hidden pb-28 md:pb-12">
        <div className="dashboard-glow" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-7 md:px-10 md:py-9 xl:px-12">
          <header className="mb-8 flex items-start justify-between gap-5 md:mb-10">
            <div className="animate-rise">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-tertiary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_rgb(var(--accent)/0.65)]" />
                {today.toLocaleDateString('en-ZA', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <h1 className="display-font text-[2.5rem] font-medium leading-[0.98] tracking-tightest text-ink-primary sm:text-5xl md:text-[3.35rem]">
                {getGreeting(today)}, X.
              </h1>
              <p className="mt-3 text-sm leading-6 text-ink-secondary">
                {getBriefing(taskSummary.dueToday, taskSummary.completedToday, taskSummary.open)}
              </p>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)]">
            <section className="briefing-card animate-rise overflow-hidden rounded-[1.4rem] border border-line bg-bg-surface shadow-[0_24px_80px_rgb(0_0_0/0.12)] [animation-delay:70ms]">
              <div className="flex flex-col gap-7 p-5 sm:p-7 lg:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="eyebrow">Today</p>
                    <h2 className="display-font mt-2 text-2xl text-ink-primary sm:text-[2rem]">
                      {taskSummary.focus.length ? 'Your focus' : 'What matters today?'}
                    </h2>
                  </div>
                  <ProgressRing value={progress} done={taskSummary.completedToday} />
                </div>

                <form onSubmit={handleAdd} className="flex items-center gap-2 rounded-xl border border-line bg-bg-inset/40 p-1.5 focus-within:border-accent/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center text-lg text-accent">+</span>
                  <input
                    type="text"
                    value={addTitle}
                    onChange={(event) => setAddTitle(event.target.value)}
                    placeholder="Add something for today"
                    aria-label="Add a task for today"
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!addTitle.trim() || save.state === 'saving'}
                    className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-bg-base transition-colors hover:bg-accent-dim disabled:opacity-35"
                  >
                    {save.state === 'saving' && addTitle.trim() ? 'Saving…' : 'Add'}
                  </button>
                </form>

                {taskSummary.focus.length ? (
                  <div className="space-y-2">
                    {taskSummary.focus.map((task, index) => (
                      <FocusTask
                        key={task.id}
                        task={task}
                        index={index}
                        today={todayKey}
                        disabled={save.state === 'saving'}
                        onComplete={handleComplete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line bg-bg-inset/30 px-5 py-5 text-center">
                    <p className="text-sm text-ink-secondary">Your day is clear.</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-5">
                  <span className="text-xs text-ink-tertiary">
                    <strong className="mono-font font-medium text-ink-primary">{taskSummary.completedToday}</strong> done today
                  </span>
                  <Link href="/tasks" className="group inline-flex items-center gap-2 text-xs font-medium text-ink-secondary transition-colors hover:text-accent">
                    View all tasks <Arrow />
                  </Link>
                </div>
              </div>
            </section>

            <aside className="animate-rise rounded-[1.4rem] border border-line bg-bg-surface/65 p-5 [animation-delay:130ms] sm:p-6">
              <p className="eyebrow">Task overview</p>
              <div className="mt-6 border-b border-line pb-6">
                <p className="display-font text-5xl font-medium tracking-tightest text-ink-primary">{taskSummary.open}</p>
                <p className="mt-1 text-xs text-ink-tertiary">open tasks</p>
              </div>
              <div className="space-y-1 py-4">
                <SummaryRow label="Needs attention" value={taskSummary.dueToday} accent={taskSummary.dueToday > 0} />
                <SummaryRow label="Upcoming" value={taskSummary.upcoming} />
                <SummaryRow label="Completed today" value={taskSummary.completedToday} />
              </div>
              <Link href="/tasks" className="mt-2 flex w-full items-center justify-between rounded-xl bg-bg-inset px-4 py-3 text-xs font-medium text-ink-primary transition-colors hover:bg-accent/10 hover:text-accent">
                Open tasks <Arrow />
              </Link>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getBriefing(due: number, done: number, open: number) {
  if (due > 0) return `${due} ${due === 1 ? 'task needs' : 'tasks need'} your attention.`;
  if (done > 0) return `${done} ${done === 1 ? 'task' : 'tasks'} completed today.`;
  if (open > 0) return 'Nothing is overdue. Choose what matters next.';
  return 'A clear day. Choose one thing that matters.';
}

function sortTasks(a: Task, b: Task) {
  const priority = { high: 0, medium: 1, low: 2 };
  return priority[a.priority] - priority[b.priority]
    || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
}

function FocusTask({
  task,
  index,
  today,
  disabled,
  onComplete,
}: {
  task: Task;
  index: number;
  today: string;
  disabled: boolean;
  onComplete: (task: Task) => void;
}) {
  const overdue = Boolean(task.dueDate && task.dueDate < today);
  const dueLabel = overdue
    ? 'Overdue'
    : task.dueDate === today
      ? 'Due today'
      : task.dueDate
        ? 'Upcoming'
        : 'Anytime';

  return (
    <div className="group flex items-center rounded-xl border border-transparent bg-bg-inset/45 transition-all hover:border-line hover:bg-bg-inset/80">
      <button
        type="button"
        onClick={() => onComplete(task)}
        disabled={disabled}
        aria-label={`Complete ${task.title}`}
        className="grid h-14 w-14 shrink-0 place-items-center text-ink-faint transition-colors hover:text-accent disabled:cursor-wait"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-current transition-all group-hover:border-accent" />
      </button>
      <Link href="/tasks" className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-4">
        <span className="mono-font text-[10px] text-ink-faint">0{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-primary">{task.title}</span>
          <span className={`mt-0.5 block text-[11px] ${overdue ? 'text-muscle-chest' : 'text-ink-tertiary'}`}>
            {dueLabel} · {task.priority}
          </span>
        </span>
        <span className="text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-accent"><Arrow /></span>
      </Link>
    </div>
  );
}

function ProgressRing({ value, done }: { value: number; done: number }) {
  return (
    <div className="relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(var(--accent)) ${value * 3.6}deg, rgb(var(--bg-inset)) 0deg)` }}>
      <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-bg-surface text-center">
        <div>
          <p className="mono-font text-sm font-medium leading-none text-ink-primary">{value}%</p>
          <p className="mt-1 text-[8px] uppercase tracking-widest text-ink-tertiary">{done} done</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2.5 text-xs">
      <span className="text-ink-secondary">{label}</span>
      <span className={`mono-font ${accent ? 'text-accent' : 'text-ink-primary'}`}>{value}</span>
    </div>
  );
}

function Arrow() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
