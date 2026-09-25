import type { Exercise, ExerciseLog, Settings } from './types';
import { describeInterval, fmtNum, formatClock, intervalTotalSeconds } from './utils';

export function summarizeExercise(ex: Exercise, settings: Settings): string {
  const d = ex.defaults;
  switch (ex.kind) {
    case 'strength':
      return `${d.sets ?? 3} × ${d.reps ?? 10}${d.weight ? ` @ ${fmtNum(d.weight)} ${settings.weightUnit}` : ''}`;
    case 'cardio':
      return [d.minutes ? `${d.minutes} min` : null, d.distance ? `${fmtNum(d.distance)} ${settings.distanceUnit}` : null]
        .filter(Boolean)
        .join(' · ') || 'Time & distance';
    case 'interval':
      return d.interval ? `${describeInterval(d.interval)} · ${formatClock(intervalTotalSeconds(d.interval))}` : 'Interval';
    case 'check':
      return 'Mark done';
  }
}

export function summarizeLog(log: ExerciseLog, settings: Settings): string {
  switch (log.kind) {
    case 'strength': {
      const sets = (log.sets ?? []).filter((s) => s.done);
      const list = sets.length ? sets : log.sets ?? [];
      if (list.length === 0) return 'No sets';
      const same = list.every((s) => s.reps === list[0].reps && s.weight === list[0].weight);
      const one = (s: { reps: number | null; weight: number | null }) =>
        `${s.reps ?? '–'}${s.weight != null ? ` @ ${fmtNum(s.weight)}${settings.weightUnit}` : ''}`;
      if (same) return `${list.length} × ${one(list[0])}`;
      return list.map(one).join(', ');
    }
    case 'cardio':
      return (
        [log.minutes != null ? `${fmtNum(log.minutes)} min` : null, log.distance != null ? `${fmtNum(log.distance)} ${settings.distanceUnit}` : null]
          .filter(Boolean)
          .join(' · ') || (log.done ? 'Done' : '—')
      );
    case 'interval':
      return log.interval
        ? `${log.roundsDone ?? 0}/${log.interval.rounds} rounds · ${describeInterval(log.interval)}`
        : 'Interval';
    case 'check':
      return log.done ? 'Done' : 'Not done';
  }
}

export const EFFORTS = [
  { value: 1, emoji: '😌', label: 'Easy' },
  { value: 2, emoji: '🙂', label: 'Light' },
  { value: 3, emoji: '💪', label: 'Solid' },
  { value: 4, emoji: '😤', label: 'Hard' },
  { value: 5, emoji: '🥵', label: 'All out' },
];
