export type ExerciseKind = 'strength' | 'cardio' | 'interval' | 'check';

export interface IntervalStep {
  id: string;
  label: string;
  seconds: number;
}

export interface IntervalConfig {
  warmup: number; // seconds, 0 = none
  steps: IntervalStep[]; // one round, e.g. Run 60s -> Rest 120s
  rounds: number;
  cooldown: number; // seconds, 0 = none
}

export interface ExerciseDefaults {
  sets?: number;
  reps?: number;
  weight?: number;
  minutes?: number;
  distance?: number;
  interval?: IntervalConfig;
}

export interface Exercise {
  id: string;
  name: string;
  categoryId: string;
  kind: ExerciseKind;
  inWheel: boolean;
  defaults: ExerciseDefaults;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  inWheel: boolean;
}

export interface SetLog {
  reps: number | null;
  weight: number | null;
  done: boolean;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string | null;
  name: string;
  kind: ExerciseKind;
  sets?: SetLog[];
  minutes?: number | null;
  distance?: number | null;
  interval?: IntervalConfig;
  roundsDone?: number;
  done: boolean;
}

export interface Workout {
  id: string;
  startedAt: number;
  finishedAt: number | null;
  categoryId: string | null;
  categoryName: string;
  categoryEmoji: string;
  categoryColor: string;
  exercises: ExerciseLog[];
  effort: number | null; // 1-5
  notes: string;
  spun: boolean;
}

export interface Settings {
  exercisesPerWorkout: number;
  sound: boolean;
  vibration: boolean;
  avoidRepeat: boolean;
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'km' | 'mi';
}

export const KIND_LABELS: Record<ExerciseKind, string> = {
  strength: 'Sets × reps',
  cardio: 'Time & distance',
  interval: 'Interval timer',
  check: 'Just mark done',
};

export const KIND_ICONS: Record<ExerciseKind, string> = {
  strength: '🏋️',
  cardio: '⏱️',
  interval: '🔁',
  check: '✅',
};
