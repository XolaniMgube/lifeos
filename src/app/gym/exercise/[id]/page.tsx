'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { exercises } from '@/data/exercises';
import { days } from '@/data/days';
import { useLastEntry } from '@/store/useStore';

export default function ExerciseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const exercise = exercises[id];
  const lastEntry = useLastEntry(id);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!exercise) {
    return (
      <div className="flex min-h-screen bg-bg-base">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-10 pb-28 md:pb-10">
          <p>Exercise not found.</p>
        </main>
      </div>
    );
  }

  // Find which day this exercise belongs to
  const parentDay = days.find((d) => d.groups.some((g) => g.exerciseIds.includes(id)));

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-28 md:pb-10">
        <button
          onClick={() => router.back()}
          className="text-sm text-ink-tertiary hover:text-ink-primary mb-6 inline-flex items-center gap-1.5"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">
            {parentDay && (
              <Link href={`/gym`} className="hover:text-accent">
                Day {parentDay.id} · {parentDay.name}
              </Link>
            )}
            {' · '}
            <span className="capitalize">{exercise.group}</span>
          </p>
          <h1 className="display-font text-4xl sm:text-5xl font-medium text-ink-primary tracking-tightest mb-3">
            {exercise.name}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Tag>{exercise.defaultSets} sets</Tag>
            {exercise.defaultReps && <Tag>{exercise.defaultReps} reps</Tag>}
            <Tag>{exercise.trackingType.replace('-', ' / ')}</Tag>
          </div>
        </div>

        {/* Image */}
        <div className="bg-bg-surface border border-line rounded-xl overflow-hidden mb-8 grain">
          <div className="aspect-[4/3] sm:aspect-video w-full bg-bg-inset relative">
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Last performance */}
        {lastEntry && (
          <div className="bg-bg-surface border border-accent/30 rounded-xl p-5 mb-8">
            <p className="text-xs uppercase tracking-widest text-accent mb-3">Last time</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {lastEntry.sets.map((set, i) => (
                <div key={i} className="mono-font text-sm">
                  <span className="text-ink-tertiary">Set {i + 1}: </span>
                  <span className="text-ink-primary">
                    {set.weight !== undefined ? `${set.weight}kg × ` : ''}
                    {set.reps !== undefined ? `${set.reps} reps` : ''}
                    {set.duration !== undefined ? `${set.duration}s` : ''}
                  </span>
                </div>
              ))}
            </div>
            {lastEntry.notes && (
              <p className="text-sm text-ink-secondary mt-3 italic">"{lastEntry.notes}"</p>
            )}
          </div>
        )}

        {/* Setup */}
        <Section title="Setup">
          <p>{exercise.setup}</p>
        </Section>

        {/* Movement */}
        <Section title="The movement">
          <p>{exercise.movement}</p>
        </Section>

        {/* Cues */}
        <Section title="Cues that matter">
          <ul className="space-y-2">
            {exercise.cues.map((cue, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-accent mono-font text-xs mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-ink-primary">{cue}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Mistakes */}
        <Section title="Common mistakes">
          <ul className="space-y-2">
            {exercise.mistakes.map((m, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-muscle-chest mono-font text-xs mt-1 shrink-0">×</span>
                <span className="text-ink-secondary">{m}</span>
              </li>
            ))}
          </ul>
        </Section>

        {parentDay && (
          <div className="mt-10 pt-8 border-t border-line">
            <Link
              href={`/gym/log?day=${parentDay.id}`}
              className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-md bg-accent text-bg-base font-medium text-sm hover:bg-accent-dim transition-colors"
            >
              Log Day {parentDay.id} session
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="display-font text-xl text-ink-primary mb-3">{title}</h2>
      <div className="text-ink-primary leading-relaxed">{children}</div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-bg-inset text-ink-secondary border border-line mono-font">
      {children}
    </span>
  );
}
