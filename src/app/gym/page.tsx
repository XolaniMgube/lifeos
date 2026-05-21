'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { days, milestones } from '@/data/days';
import { exercises } from '@/data/exercises';
import { useStore, useGymStats } from '@/store/useStore';

export default function GymPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const stats = useGymStats();
  const sessions = useStore((s) => s.gym.sessions);
  const cycleSessions = sessions.filter((s) => s.cycleNumber === stats.currentCycle);
  const completedDays = new Set(cycleSessions.map((s) => s.dayNumber));

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-28 md:pb-10">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">Module · Gym</p>
          <h1 className="display-font text-4xl sm:text-5xl font-medium text-ink-primary tracking-tightest mb-3">The Cycle</h1>
          <p className="text-ink-secondary max-w-xl">
            Four training days, two rest days. Push, pull, legs, lift — repeat. No muscle worked twice in a cycle. Built for longevity.
          </p>
        </div>

        {/* Cycle rhythm */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="display-font text-xl text-ink-primary">Cycle {stats.currentCycle} rhythm</h2>
            <Link href="/gym/history" className="text-xs uppercase tracking-widest text-ink-tertiary hover:text-accent transition-colors">
              History →
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { type: 'day', day: 1 },
              { type: 'day', day: 2 },
              { type: 'rest' },
              { type: 'day', day: 3 },
              { type: 'day', day: 4 },
              { type: 'rest' },
            ].map((cell, i) => {
              if (cell.type === 'rest') {
                return (
                  <div key={i} className="bg-bg-inset/50 border border-dashed border-line rounded-lg p-4 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-ink-faint">Rest</p>
                  </div>
                );
              }
              const dayDef = days.find((d) => d.id === cell.day)!;
              const done = completedDays.has(cell.day!);
              return (
                <Link
                  key={i}
                  href={`/gym/log?day=${cell.day}`}
                  className={`relative bg-bg-surface border rounded-lg p-4 text-center transition-all hover:-translate-y-0.5 ${
                    done ? 'border-accent/40' : 'border-line hover:border-accent/30'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Day {cell.day}</p>
                  <p className="display-font text-lg text-ink-primary">{dayDef.name}</p>
                  {done && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Days breakdown */}
        <section className="mb-10">
          <h2 className="display-font text-xl text-ink-primary mb-4">Workout days</h2>
          <div className="space-y-4">
            {days.map((day) => {
              const totalSets = day.groups.reduce(
                (sum, g) => sum + g.exerciseIds.reduce((s, id) => s + (exercises[id]?.defaultSets ?? 0), 0),
                0
              );
              const done = completedDays.has(day.id);
              return (
                <div
                  key={day.id}
                  className="bg-bg-surface border border-line rounded-xl overflow-hidden"
                >
                  <div className="flex items-stretch">
                    <div className={`w-1 bg-muscle-${day.groups[0].muscleHue}`} />
                    <div className="flex-1 p-4 sm:p-5 min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between mb-3">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-1">Day {day.id}</p>
                          <h3 className="display-font text-xl sm:text-2xl text-ink-primary">{day.name} <span className="text-ink-tertiary">— {day.subtitle}</span></h3>
                        </div>
                        <span className="text-xs text-ink-tertiary mono-font">{totalSets} sets</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-4">
                        {day.groups.map((group) => (
                          <div key={group.label}>
                            <p className="text-[11px] uppercase tracking-widest text-ink-tertiary mt-2 mb-1.5">
                              {group.label}
                            </p>
                            {group.exerciseIds.map((id) => {
                              const ex = exercises[id];
                              return (
                                <Link
                                  key={id}
                                  href={`/gym/exercise/${id}`}
                                  className="flex items-center justify-between py-1.5 -mx-2 px-2 rounded hover:bg-bg-inset/50 transition-colors group"
                                >
                                  <span className="text-sm text-ink-primary group-hover:text-accent transition-colors">
                                    {ex.name}
                                  </span>
                                  <span className="text-xs text-ink-tertiary mono-font">
                                    {ex.defaultSets}×{ex.defaultReps ?? '—'}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-line">
                        <Link
                          href={`/gym/log?day=${day.id}`}
                          className="text-xs min-h-11 inline-flex items-center px-3 py-1.5 rounded-md bg-accent text-bg-base font-medium hover:bg-accent-dim transition-colors"
                        >
                          {done ? 'Edit log' : 'Log session'}
                        </Link>
                        <Link
                          href={`/gym/exercise/${day.groups[0].exerciseIds[0]}`}
                          className="text-xs min-h-11 inline-flex items-center px-3 py-1.5 rounded-md text-ink-secondary hover:text-ink-primary border border-line hover:border-accent/40 transition-colors"
                        >
                          See form
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Milestones */}
        <section className="mb-10">
          <h2 className="display-font text-xl text-ink-primary mb-4">Monthly milestones</h2>
          <p className="text-sm text-ink-secondary mb-4 max-w-2xl">
            Targets to hit over the next 4-12 weeks. These are how you'll know you're progressing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {milestones.map((m) => (
              <div key={m.lift} className="bg-bg-surface border border-line rounded-lg p-4">
                <p className="text-xs text-ink-tertiary mb-1.5">{m.lift}</p>
                <p className="display-font text-xl text-accent mb-1">{m.target}</p>
                <p className="text-[11px] text-ink-tertiary uppercase tracking-wider">{m.cadence}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Progression rules */}
        <section>
          <h2 className="display-font text-xl text-ink-primary mb-4">How progression works</h2>
          <div className="space-y-2">
            <RuleCard label="Session" rule="Beat last session by one rep on one set." />
            <RuleCard label="Cycle" rule="Total volume up, top set up by one rep, or a weight bump on at least one lift." />
            <RuleCard label="Add weight" rule="When you hit your top rep target on all sets for two sessions in a row." />
          </div>
        </section>
      </main>
    </div>
  );
}

function RuleCard({ label, rule }: { label: string; rule: string }) {
  return (
    <div className="flex items-start gap-4 bg-bg-surface border border-line rounded-lg px-5 py-3.5">
      <span className="text-[10px] uppercase tracking-widest text-ink-tertiary mono-font min-w-[80px] mt-0.5">
        {label}
      </span>
      <p className="text-sm text-ink-primary">{rule}</p>
    </div>
  );
}
