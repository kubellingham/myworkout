import type { ExerciseLog, PR, PRKind, SetLog, Settings, Workout } from './types';
import { fmtNum } from './utils';

export type Metrics = Partial<Record<PRKind, number>>;

/** Stable identity for an exercise across workouts; custom ones match by name. */
export function exerciseKey(log: Pick<ExerciseLog, 'exerciseId' | 'name'>): string {
  return log.exerciseId ?? `name:${log.name.trim().toLowerCase()}`;
}

/** Sets that count: ticked ones, or every filled-in set once the exercise is marked done. */
export function countedSets(log: ExerciseLog): SetLog[] {
  const sets = log.sets ?? [];
  return sets.filter((s) => s.done || (log.done && s.reps != null));
}

export function metricsOf(log: ExerciseLog): Metrics {
  const m: Metrics = {};
  if (log.kind === 'strength') {
    const sets = countedSets(log).filter((s) => (s.reps ?? 0) > 0);
    const weighted = sets.filter((s) => (s.weight ?? 0) > 0);
    const bodyweight = sets.filter((s) => !((s.weight ?? 0) > 0));
    if (weighted.length) {
      m.weight = Math.max(...weighted.map((s) => s.weight!));
      m.volume = weighted.reduce((sum, s) => sum + s.reps! * s.weight!, 0);
    }
    if (bodyweight.length) m.reps = Math.max(...bodyweight.map((s) => s.reps!));
  } else if (log.kind === 'cardio' && log.done) {
    if ((log.distance ?? 0) > 0) m.distance = log.distance!;
    if ((log.minutes ?? 0) > 0) m.minutes = log.minutes!;
  }
  return m;
}

function merge(into: Metrics, m: Metrics) {
  for (const k of Object.keys(m) as PRKind[]) {
    into[k] = Math.max(into[k] ?? -Infinity, m[k]!);
  }
}

/** Best value of every metric for one exercise across the given workouts. */
export function bestsFor(history: Workout[], key: string): Metrics {
  const best: Metrics = {};
  for (const w of history) {
    for (const log of w.exercises) {
      if (exerciseKey(log) === key) merge(best, metricsOf(log));
    }
  }
  return best;
}

/** New records set by `log`. A first-ever session never counts — there's nothing to beat. */
export function detectPRs(log: ExerciseLog, bests: Metrics): PR[] {
  const m = metricsOf(log);
  const out: PR[] = [];
  for (const k of Object.keys(m) as PRKind[]) {
    const prev = bests[k];
    if (prev != null && m[k]! > prev) {
      out.push({ key: exerciseKey(log), name: log.name, kind: k, value: m[k]!, previous: prev });
    }
  }
  return out;
}

/** Records set in a whole workout, compared against `history` (which must not include it). */
export function workoutPRs(workout: Workout, history: Workout[]): PR[] {
  const seen = new Map<string, Metrics>();
  const out: PR[] = [];
  for (const log of workout.exercises) {
    const key = exerciseKey(log);
    if (!seen.has(key)) seen.set(key, bestsFor(history, key));
    const bests = seen.get(key)!;
    const prs = detectPRs(log, bests);
    out.push(...prs);
    // A second entry of the same exercise must beat the first one too.
    merge(bests, metricsOf(log));
  }
  return out;
}

export const PR_LABELS: Record<PRKind, string> = {
  weight: 'Heaviest',
  reps: 'Most reps',
  volume: 'Most volume',
  distance: 'Longest distance',
  minutes: 'Longest time',
};

export function formatMetric(kind: PRKind, value: number, settings: Settings): string {
  switch (kind) {
    case 'weight':
      return `${fmtNum(value)} ${settings.weightUnit}`;
    case 'volume':
      return `${Math.round(value).toLocaleString()} ${settings.weightUnit}`;
    case 'reps':
      return `${fmtNum(value)} reps`;
    case 'distance':
      return `${fmtNum(value)} ${settings.distanceUnit}`;
    case 'minutes':
      return `${fmtNum(value)} min`;
  }
}

export interface ExerciseSummary {
  key: string;
  name: string;
  kind: ExerciseLog['kind'];
  sessions: number;
  lastAt: number;
  bests: Metrics;
  /** Oldest first: one point per session for the main metric. */
  series: { at: number; value: number; workoutId: string }[];
  metric: PRKind | null;
}

/** The metric that best describes progress for an exercise. */
export function mainMetric(bests: Metrics): PRKind | null {
  if (bests.weight != null) return 'weight';
  if (bests.reps != null) return 'reps';
  if (bests.distance != null) return 'distance';
  if (bests.minutes != null) return 'minutes';
  return null;
}

export function summarizeExercises(history: Workout[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary & { points: { at: number; m: Metrics; workoutId: string }[] }>();
  for (const w of history) {
    const at = w.finishedAt ?? w.startedAt;
    for (const log of w.exercises) {
      const m = metricsOf(log);
      if (Object.keys(m).length === 0) continue;
      const key = exerciseKey(log);
      let s = map.get(key);
      if (!s) {
        s = { key, name: log.name, kind: log.kind, sessions: 0, lastAt: at, bests: {}, series: [], metric: null, points: [] };
        map.set(key, s);
      }
      s.sessions++;
      s.lastAt = Math.max(s.lastAt, at);
      merge(s.bests, m);
      s.points.push({ at, m, workoutId: w.id });
    }
  }
  return [...map.values()]
    .map(({ points, ...s }) => {
      const metric = mainMetric(s.bests);
      const series = metric
        ? points
            .filter((p) => p.m[metric] != null)
            .map((p) => ({ at: p.at, value: p.m[metric]!, workoutId: p.workoutId }))
            .sort((a, b) => a.at - b.at)
        : [];
      return { ...s, metric, series };
    })
    .sort((a, b) => b.lastAt - a.lastAt);
}
