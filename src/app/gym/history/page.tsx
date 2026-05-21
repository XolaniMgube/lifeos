'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { useStore } from '@/store/useStore';
import { exercises } from '@/data/exercises';
import { days } from '@/data/days';

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sessions = useStore((s) => s.gym.sessions);

  // Group by cycle
  const cycles: Record<number, typeof sessions> = {};
  sessions.forEach((s) => {
    if (!cycles[s.cycleNumber]) cycles[s.cycleNumber] = [];
    cycles[s.cycleNumber].push(s);
  });

  const cycleNumbers = Object.keys(cycles).map(Number).sort((a, b) => b - a);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 max-w-5xl mx-auto px-8 py-10">
        <Link href="/gym" className="text-sm text-ink-tertiary hover:text-ink-primary mb-6 inline-flex items-center gap-1.5">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Gym
        </Link>

        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">All cycles</p>
          <h1 className="display-font text-4xl font-medium text-ink-primary tracking-tightest">History</h1>
        </div>

        {cycleNumbers.length === 0 ? (
          <div className="bg-bg-surface border border-dashed border-line rounded-xl p-10 text-center">
            <p className="text-ink-secondary mb-2">No sessions logged yet.</p>
            <p className="text-sm text-ink-tertiary">Go log your first one — your future self will thank you.</p>
            <Link
              href="/gym/log?day=1"
              className="inline-block mt-5 px-5 py-2.5 rounded-md bg-accent text-bg-base font-medium text-sm hover:bg-accent-dim transition-colors"
            >
              Start logging
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {cycleNumbers.map((cycleNum) => {
              const cycleSessions = cycles[cycleNum].sort((a, b) => a.dayNumber - b.dayNumber);
              const totalSets = cycleSessions.reduce(
                (sum, s) => sum + s.exercises.reduce((sub, ex) => sub + ex.sets.length, 0),
                0
              );
              const totalVolume = cycleSessions.reduce(
                (sum, s) => sum + s.exercises.reduce(
                  (sub, ex) => sub + ex.sets.reduce(
                    (vsum, set) => vsum + ((set.weight ?? 0) * (set.reps ?? 0)),
                    0
                  ),
                  0
                ),
                0
              );

              return (
                <div key={cycleNum} className="bg-bg-surface border border-line rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-line flex items-baseline justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-1">Cycle</p>
                      <h2 className="display-font text-2xl text-ink-primary">#{cycleNum}</h2>
                    </div>
                    <div className="flex gap-6 text-right">
                      <div>
                        <p className="mono-font text-lg text-ink-primary">{cycleSessions.length}/4</p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-tertiary">days</p>
                      </div>
                      <div>
                        <p className="mono-font text-lg text-ink-primary">{totalSets}</p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-tertiary">sets</p>
                      </div>
                      <div>
                        <p className="mono-font text-lg text-accent">{Math.round(totalVolume).toLocaleString()}</p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-tertiary">kg volume</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-line">
                    {cycleSessions.map((session) => {
                      const dayDef = days.find((d) => d.id === session.dayNumber)!;
                      return (
                        <Link
                          key={session.id}
                          href={`/gym/log?day=${session.dayNumber}`}
                          className="block px-6 py-4 hover:bg-bg-inset/30 transition-colors group"
                        >
                          <div className="flex items-baseline justify-between mb-2">
                            <div>
                              <span className="display-font text-lg text-ink-primary">Day {session.dayNumber}</span>
                              <span className="text-ink-tertiary ml-2">— {dayDef.name}</span>
                            </div>
                            <span className="text-xs text-ink-tertiary mono-font">
                              {new Date(session.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mono-font text-xs">
                            {session.exercises.slice(0, 4).map((ex) => {
                              const exDef = exercises[ex.exerciseId];
                              const topSet = ex.sets[0];
                              if (!topSet || (!topSet.weight && !topSet.reps && !topSet.duration)) return null;
                              return (
                                <span key={ex.exerciseId} className="text-ink-secondary">
                                  <span className="text-ink-tertiary">{exDef?.name.split(',')[0]}: </span>
                                  {topSet.weight ? `${topSet.weight}kg ` : ''}
                                  {topSet.reps ? `×${topSet.reps}` : topSet.duration ? `${topSet.duration}s` : ''}
                                </span>
                              );
                            })}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
