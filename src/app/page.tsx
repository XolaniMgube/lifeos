'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { useStore, useGymStats } from '@/store/useStore';
import { days } from '@/data/days';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const stats = useGymStats();
  const sessions = useStore((s) => s.gym.sessions);

  // Determine what day to suggest next
  const cycleSessions = sessions.filter((s) => s.cycleNumber === stats.currentCycle);
  const completedDays = new Set(cycleSessions.map((s) => s.dayNumber));
  const nextDay = [1, 2, 3, 4].find((d) => !completedDays.has(d)) ?? 1;
  const nextDayDef = days.find((d) => d.id === nextDay)!;

  const today = new Date();
  const greeting = getGreeting(today);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 max-w-5xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">
            {today.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="display-font text-5xl font-medium text-ink-primary tracking-tightest">
            {greeting}, X.
          </h1>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard label="Current cycle" value={`#${stats.currentCycle}`} sub={`${stats.cycleProgress} of 4 days done`} />
          <StatCard label="Streak" value={`${stats.streak}`} sub={stats.streak === 1 ? 'session' : 'sessions'} accent />
          <StatCard label="Total sessions" value={`${stats.totalSessions}`} sub="logged" />
        </div>

        {/* Next workout */}
        <section className="mb-10">
          <SectionHeader title="Next at the gym" sub={`Day ${nextDay} · ${nextDayDef.subtitle}`} />
          <Link
            href={`/gym/log?day=${nextDay}`}
            className="block bg-bg-surface border border-line rounded-xl p-6 hover:border-accent/40 transition-colors group grain"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">Day {nextDay}</p>
                <h3 className="display-font text-3xl text-ink-primary mb-1">{nextDayDef.name}</h3>
                <p className="text-sm text-ink-secondary">{nextDayDef.subtitle}</p>
              </div>
              <span className="text-ink-tertiary group-hover:text-accent transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {nextDayDef.groups.map((g) => (
                <span
                  key={g.label}
                  className="text-xs px-2.5 py-1 rounded-full bg-bg-inset text-ink-secondary border border-line"
                >
                  {g.label} · {g.exerciseIds.length}
                </span>
              ))}
            </div>
          </Link>
        </section>

        {/* Module placeholders */}
        <section>
          <SectionHeader title="Coming to your dashboard" sub="Modules in development" />
          <div className="grid grid-cols-3 gap-4">
            <PlaceholderCard label="Habits" desc="Daily check-ins, streaks, routines" />
            <PlaceholderCard label="Goals" desc="Personal & business milestones" />
            <PlaceholderCard label="Finance" desc="Spending, savings, targets" />
          </div>
        </section>
      </main>
    </div>
  );
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="display-font text-xl text-ink-primary">{title}</h2>
      {sub && <span className="text-xs text-ink-tertiary uppercase tracking-widest">{sub}</span>}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="bg-bg-surface border border-line rounded-xl p-5">
      <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-3">{label}</p>
      <p className={`display-font text-4xl font-medium tracking-tightest mb-1 ${accent ? 'text-accent' : 'text-ink-primary'}`}>
        {value}
      </p>
      <p className="text-xs text-ink-tertiary">{sub}</p>
    </div>
  );
}

function PlaceholderCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="bg-bg-surface/50 border border-dashed border-line rounded-xl p-5 opacity-60">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-ink-secondary">{label}</p>
        <span className="text-[10px] uppercase tracking-wider text-ink-faint">soon</span>
      </div>
      <p className="text-xs text-ink-tertiary leading-relaxed">{desc}</p>
    </div>
  );
}
