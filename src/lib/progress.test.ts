import { describe, expect, it } from 'vitest';
import type { ExerciseLog, Workout } from './types';
import { detectPRs, bestsFor, metricsOf, summarizeExercises, workoutPRs } from './records';
import { bmi, bmiBand, movingAverage, trendChange, fromDisplayWeight, toDisplayWeight } from './body';
import { weekStreak, weekDays } from './goals';

const DAY = 86400000;
const strength = (sets: [number, number | null, boolean?][], extra: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: Math.random().toString(),
  exerciseId: 'bench',
  name: 'Bench Press',
  kind: 'strength',
  done: false,
  sets: sets.map(([reps, weight, done = true]) => ({ reps, weight, done })),
  ...extra,
});
const workout = (at: number, exercises: ExerciseLog[]): Workout => ({
  id: Math.random().toString(),
  startedAt: at - 3600000,
  finishedAt: at,
  categoryId: null,
  categoryName: 'Push',
  categoryEmoji: '💪',
  categoryColor: '#fff',
  exercises,
  effort: null,
  notes: '',
  spun: false,
});

describe('personal records', () => {
  it('measures heaviest set, volume and bodyweight reps from ticked sets only', () => {
    const m = metricsOf(strength([[8, 60], [6, 70], [10, 80, false], [15, null]]));
    expect(m).toEqual({ weight: 70, volume: 8 * 60 + 6 * 70, reps: 15 });
  });

  it('only awards a PR when there is a previous best to beat', () => {
    const first = strength([[5, 100]]);
    expect(detectPRs(first, {})).toEqual([]);
    const history = [workout(Date.now() - DAY, [strength([[5, 100]])])];
    const prs = detectPRs(strength([[5, 102.5]]), bestsFor(history, 'bench'));
    expect(prs.map((p) => [p.kind, p.value, p.previous])).toEqual([
      ['weight', 102.5, 100],
      ['volume', 512.5, 500],
    ]);
  });

  it('compares a finished workout against earlier ones and summarises progress', () => {
    const t = Date.now();
    const older = [workout(t - 2 * DAY, [strength([[5, 90]])]), workout(t - 5 * DAY, [strength([[5, 80]])])];
    const today = workout(t, [strength([[5, 95]])]);
    expect(workoutPRs(today, older).map((p) => p.kind)).toEqual(['weight', 'volume']);
    const [bench] = summarizeExercises([today, ...older]);
    expect(bench.sessions).toBe(3);
    expect(bench.metric).toBe('weight');
    expect(bench.series.map((p) => p.value)).toEqual([80, 90, 95]);
  });
});

describe('body', () => {
  it('computes BMI and its band', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2);
    expect(bmiBand(22.9).label).toBe('Healthy');
    expect(bmiBand(18.4).label).toBe('Underweight');
    expect(bmiBand(27).label).toBe('Overweight');
    expect(bmiBand(31).label).toBe('Obese');
  });

  it('converts pounds', () => {
    expect(toDisplayWeight(fromDisplayWeight(180, 'lb'), 'lb')).toBeCloseTo(180, 6);
    expect(fromDisplayWeight(100, 'kg')).toBe(100);
  });

  it('averages the trailing 7 days and reports the trend', () => {
    const t0 = new Date(2026, 0, 1, 8).getTime();
    const pts = [80, 81, 79, 80, 80, 80, 80, 78].map((w, i) => ({ date: t0 + i * DAY, weight: w }));
    const avg = movingAverage(pts);
    expect(avg[1].avg).toBeCloseTo(80.5);
    expect(avg[7].avg).toBeCloseTo((81 + 79 + 80 * 4 + 78) / 7);
    const entries = pts.map((p, i) => ({ id: String(i), date: p.date, weight: p.weight, waist: null }));
    const trend = trendChange(entries, 30)!;
    expect(trend.since).toBe(t0);
    expect(trend.change).toBeCloseTo(avg[7].avg - 80);
  });
});

describe('weekly goal', () => {
  it('counts week streaks without breaking on the week in progress', () => {
    const now = new Date(2026, 8, 23, 12).getTime(); // Wednesday
    const lastWeek = [15, 16, 17].map((d) => workout(new Date(2026, 8, d, 9).getTime(), []));
    const twoAgo = [8, 10, 12].map((d) => workout(new Date(2026, 8, d, 9).getTime(), []));
    expect(weekStreak([...lastWeek, ...twoAgo], 3, now)).toBe(2);
    const thisWeek = [21, 22, 23].map((d) => workout(new Date(2026, 8, d, 9).getTime(), []));
    expect(weekStreak([...thisWeek, ...lastWeek, ...twoAgo], 3, now)).toBe(3);
    expect(weekStreak(twoAgo, 3, now)).toBe(0);
    const days = weekDays(thisWeek, now);
    expect(days.map((d) => d.done)).toEqual([true, true, true, false, false, false, false]);
    expect(days[2].today).toBe(true);
  });
});
