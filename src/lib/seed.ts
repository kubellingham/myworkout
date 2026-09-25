import type { Category, Exercise, ExerciseDefaults, ExerciseKind, IntervalConfig, Settings } from './types';
import { uid } from './utils';

export const DEFAULT_SETTINGS: Settings = {
  exercisesPerWorkout: 4,
  sound: true,
  vibration: true,
  avoidRepeat: true,
  weightUnit: 'kg',
  distanceUnit: 'km',
};

export const CATEGORY_COLORS = [
  '#ff6b6b',
  '#4da3ff',
  '#ffb020',
  '#b57bff',
  '#2ed39a',
  '#ff7ac6',
  '#3fd0e0',
  '#c6e23a',
  '#ff8f3f',
  '#8f9bff',
];

export function interval(
  steps: [string, number][],
  rounds: number,
  warmup = 0,
  cooldown = 0,
): IntervalConfig {
  return {
    warmup,
    cooldown,
    rounds,
    steps: steps.map(([label, seconds]) => ({ id: uid(), label, seconds })),
  };
}

type SeedExercise = [name: string, kind: ExerciseKind, defaults?: ExerciseDefaults];

const S = (sets: number, reps: number, weight?: number): ExerciseDefaults => ({ sets, reps, weight });
const C = (minutes: number, distance?: number): ExerciseDefaults => ({ minutes, distance });

const SEED: { name: string; emoji: string; color: string; exercises: SeedExercise[] }[] = [
  {
    name: 'Push',
    emoji: '💪',
    color: CATEGORY_COLORS[0],
    exercises: [
      ['Bench Press', 'strength', S(4, 8)],
      ['Push-ups', 'strength', S(3, 15)],
      ['Overhead Press', 'strength', S(4, 8)],
      ['Incline DB Press', 'strength', S(3, 10)],
      ['Dips', 'strength', S(3, 10)],
      ['Lateral Raises', 'strength', S(3, 12)],
      ['Triceps Pushdown', 'strength', S(3, 12)],
    ],
  },
  {
    name: 'Pull',
    emoji: '🧗',
    color: CATEGORY_COLORS[1],
    exercises: [
      ['Pull-ups', 'strength', S(4, 6)],
      ['Barbell Row', 'strength', S(4, 8)],
      ['Lat Pulldown', 'strength', S(3, 10)],
      ['Seated Cable Row', 'strength', S(3, 10)],
      ['Face Pulls', 'strength', S(3, 15)],
      ['Biceps Curls', 'strength', S(3, 12)],
      ['Hammer Curls', 'strength', S(3, 12)],
    ],
  },
  {
    name: 'Legs',
    emoji: '🦵',
    color: CATEGORY_COLORS[2],
    exercises: [
      ['Back Squat', 'strength', S(4, 8)],
      ['Romanian Deadlift', 'strength', S(3, 10)],
      ['Walking Lunges', 'strength', S(3, 12)],
      ['Leg Press', 'strength', S(3, 12)],
      ['Bulgarian Split Squat', 'strength', S(3, 10)],
      ['Calf Raises', 'strength', S(4, 15)],
      ['Glute Bridge', 'strength', S(3, 15)],
    ],
  },
  {
    name: 'Core',
    emoji: '🎯',
    color: CATEGORY_COLORS[3],
    exercises: [
      ['Plank', 'interval', { interval: interval([['Hold', 45], ['Rest', 15]], 3) }],
      ['Hanging Leg Raises', 'strength', S(3, 10)],
      ['Russian Twists', 'strength', S(3, 20)],
      ['Dead Bug', 'strength', S(3, 12)],
      ['Mountain Climbers', 'interval', { interval: interval([['Climb', 30], ['Rest', 30]], 4) }],
      ['Ab Wheel', 'strength', S(3, 10)],
    ],
  },
  {
    name: 'Cardio',
    emoji: '🏃',
    color: CATEGORY_COLORS[4],
    exercises: [
      ['Run / Walk Intervals', 'interval', { interval: interval([['Run', 60], ['Walk', 120]], 6, 180, 180) }],
      ['Easy Run', 'cardio', C(30, 5)],
      ['Cycling', 'cardio', C(40, 15)],
      ['Jump Rope', 'interval', { interval: interval([['Jump', 60], ['Rest', 30]], 8) }],
      ['Rowing', 'cardio', C(20, 4)],
      ['Tabata Sprints', 'interval', { interval: interval([['Sprint', 20], ['Rest', 10]], 8, 120, 120) }],
      ['Stair Climber', 'cardio', C(15)],
    ],
  },
  {
    name: 'Full Body',
    emoji: '🔥',
    color: CATEGORY_COLORS[5],
    exercises: [
      ['Deadlift', 'strength', S(4, 5)],
      ['Burpees', 'strength', S(3, 12)],
      ['Kettlebell Swings', 'strength', S(4, 15)],
      ['Thrusters', 'strength', S(3, 10)],
      ['Clean & Press', 'strength', S(4, 6)],
      ['Circuit 40/20', 'interval', { interval: interval([['Work', 40], ['Rest', 20]], 10) }],
      ["Farmer's Carry", 'check'],
    ],
  },
  {
    name: 'Mobility',
    emoji: '🧘',
    color: CATEGORY_COLORS[6],
    exercises: [
      ['Yoga Flow', 'cardio', C(20)],
      ['Hip Openers', 'check'],
      ['Hamstring Stretch', 'interval', { interval: interval([['Stretch', 30], ['Switch', 10]], 4) }],
      ['Foam Rolling', 'cardio', C(10)],
      ["World's Greatest Stretch", 'check'],
      ['Cat-Cow', 'check'],
    ],
  },
];

export function createSeed(): { categories: Category[]; exercises: Exercise[] } {
  const categories: Category[] = [];
  const exercises: Exercise[] = [];
  for (const c of SEED) {
    const id = uid();
    categories.push({ id, name: c.name, emoji: c.emoji, color: c.color, inWheel: true });
    for (const [name, kind, defaults] of c.exercises) {
      exercises.push({ id: uid(), name, categoryId: id, kind, inWheel: true, defaults: defaults ?? {} });
    }
  }
  return { categories, exercises };
}

export function defaultsForKind(kind: ExerciseKind): ExerciseDefaults {
  switch (kind) {
    case 'strength':
      return S(3, 10);
    case 'cardio':
      return C(20);
    case 'interval':
      return { interval: interval([['Work', 60], ['Rest', 120]], 6) };
    case 'check':
      return {};
  }
}
