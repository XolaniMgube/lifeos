import { exercises } from './exercises';

export type DayDef = {
  id: number;
  name: string;
  subtitle: string;
  groups: {
    label: string;
    muscleHue: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';
    exerciseIds: string[];
  }[];
};

export const days: DayDef[] = [
  {
    id: 1,
    name: 'Push',
    subtitle: 'Chest + triceps',
    groups: [
      {
        label: 'Chest',
        muscleHue: 'chest',
        exerciseIds: ['flat-bench-medium', 'flat-bench-wide', 'incline-bench-medium', 'incline-bench-wide'],
      },
      {
        label: 'Triceps',
        muscleHue: 'arms',
        exerciseIds: ['dips', 'skull-crushers', 'overhead-extension'],
      },
    ],
  },
  {
    id: 2,
    name: 'Pull',
    subtitle: 'Back + biceps',
    groups: [
      {
        label: 'Back',
        muscleHue: 'back',
        exerciseIds: ['bent-over-row', 'single-arm-row', 'inverted-row'],
      },
      {
        label: 'Biceps',
        muscleHue: 'arms',
        exerciseIds: ['ez-curl-close', 'ez-curl-medium', 'hammer-curls'],
      },
    ],
  },
  {
    id: 3,
    name: 'Legs',
    subtitle: 'Legs + core',
    groups: [
      {
        label: 'Legs',
        muscleHue: 'legs',
        exerciseIds: ['squats', 'calf-raises', 'walking-lunges'],
      },
      {
        label: 'Core',
        muscleHue: 'core',
        exerciseIds: ['hanging-knee-raises', 'crunches', 'russian-twists', 'plank'],
      },
    ],
  },
  {
    id: 4,
    name: 'Lift',
    subtitle: 'Shoulders + forearms',
    groups: [
      {
        label: 'Shoulders',
        muscleHue: 'shoulders',
        exerciseIds: ['seated-press', 'lateral-raises'],
      },
      {
        label: 'Forearms',
        muscleHue: 'arms',
        exerciseIds: ['reverse-ez-curl', 'wrist-curls', 'reverse-wrist-curls', 'farmers-carry'],
      },
    ],
  },
];

export const milestones = [
  { lift: 'Bench press', target: '+2.5kg', cadence: 'every 4-6 weeks' },
  { lift: 'Squats', target: '+5kg', cadence: 'every 4 weeks' },
  { lift: 'Bent-over rows', target: '+2.5kg', cadence: 'every 4-6 weeks' },
  { lift: 'Shoulder press', target: '+2.5kg', cadence: 'every 6-8 weeks' },
  { lift: 'Dips', target: '4×12 → add weight', cadence: 'graduate when clean' },
  { lift: 'Plank', target: '30s → 60s → 90s', cadence: 'over 8-12 weeks' },
];
