import type { Workout } from './types';
import { shiftWeek, weekStart } from './utils';

const at = (w: Workout) => w.finishedAt ?? w.startedAt;

export function workoutsInWeek(history: Workout[], weekStartTs: number): Workout[] {
  const end = shiftWeek(weekStartTs, 1);
  return history.filter((w) => at(w) >= weekStartTs && at(w) < end);
}

/**
 * Consecutive weeks that hit the goal, counting back from last week.
 * The current week adds to the streak once it's hit, but never breaks it while still in progress.
 */
export function weekStreak(history: Workout[], goal: number, now = Date.now()): number {
  if (goal <= 0) return 0;
  const thisWeek = weekStart(now);
  let streak = workoutsInWeek(history, thisWeek).length >= goal ? 1 : 0;
  for (let i = 1; i < 520; i++) {
    const wk = shiftWeek(thisWeek, -i);
    if (workoutsInWeek(history, wk).length >= goal) streak++;
    else break;
  }
  return streak;
}

/** Monday..Sunday flags for the week containing `now`. */
export function weekDays(history: Workout[], now = Date.now()): { day: number; done: boolean; today: boolean; future: boolean }[] {
  const start = weekStart(now);
  const inWeek = workoutsInWeek(history, start);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const day = d.getTime();
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      day,
      done: inWeek.some((w) => at(w) >= day && at(w) < next.getTime()),
      today: now >= day && now < next.getTime(),
      future: day > now,
    };
  });
}
