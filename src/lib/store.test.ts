import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('store', () => {
  beforeEach(() => useStore.getState().resetAll());

  it('seeds categories with exercises', () => {
    const { categories, exercises } = useStore.getState();
    expect(categories.length).toBeGreaterThanOrEqual(6);
    for (const c of categories) expect(exercises.some((e) => e.categoryId === c.id)).toBe(true);
  });

  it('turns a spin plan into a workout and saves it to history', () => {
    const s = useStore.getState();
    const legs = s.categories.find((c) => c.name === 'Legs')!;
    const picks = s.exercises.filter((e) => e.categoryId === legs.id).slice(0, 3).map((e) => e.id);
    s.setSpinCategory(legs.id);
    picks.forEach((p) => useStore.getState().addSpinPick(p));
    useStore.getState().startWorkout(legs.id, useStore.getState().spin.picks, true);

    const active = useStore.getState().active!;
    expect(active.categoryName).toBe('Legs');
    expect(active.exercises.map((e) => e.exerciseId)).toEqual(picks);
    expect(active.exercises[0].sets!.length).toBeGreaterThan(0);
    expect(useStore.getState().spin.picks).toEqual([]);

    const log = active.exercises[0];
    useStore.getState().updateActiveExercise(log.id, { sets: log.sets!.map((x) => ({ ...x, weight: 60, done: true })), done: true });
    useStore.getState().finishWorkout(4, 'felt good');
    const { history, active: after } = useStore.getState();
    expect(after).toBeNull();
    expect(history[0].effort).toBe(4);
    expect(history[0].notes).toBe('felt good');

    // Next time, sets are pre-filled from the last session.
    useStore.getState().addToActive(picks[0]);
    expect(useStore.getState().active!.exercises[0].sets!.every((x) => x.weight === 60 && !x.done)).toBe(true);
  });

  it('round-trips a backup', async () => {
    const { exportData } = await import('./store');
    useStore.getState().updateSettings({ weightUnit: 'lb' });
    const json = exportData();
    useStore.getState().resetAll();
    expect(useStore.getState().settings.weightUnit).toBe('kg');
    useStore.getState().importData(json);
    expect(useStore.getState().settings.weightUnit).toBe('lb');
    expect(() => useStore.getState().importData('{"nope":1}')).toThrow();
  });
});
