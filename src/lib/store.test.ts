import { beforeEach, describe, expect, it } from 'vitest';
import { MIX_ID, useStore } from './store';
import { LIBRARY_VERSION, createSeed, seedCount, upgradeLibrary } from './seed';

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

  it('starts a Mix workout from exercises across groups', () => {
    const { exercises } = useStore.getState();
    const legs = exercises.find((e) => e.name === 'Back Squat')!;
    const pull = exercises.find((e) => e.name === 'Chin-ups')!;
    useStore.getState().startWorkout(MIX_ID, [legs.id, pull.id], true);
    const active = useStore.getState().active!;
    expect(active.categoryName).toBe('Mix');
    expect(active.categoryId).toBeNull();
    expect(active.exercises.map((e) => e.name)).toEqual(['Back Squat', 'Chin-ups']);
  });
});

describe('library upgrade', () => {
  it('ships a big library', () => {
    expect(seedCount()).toBeGreaterThan(180);
    const { exercises } = createSeed();
    expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(exercises.length);
  });

  it('adds new exercises to an old library without duplicates or resurrecting deletions', () => {
    const fresh = createSeed();
    const v1Names = ['Bench Press', 'Push-ups', 'Pull-ups', 'Back Squat', 'Plank'];
    const categories = fresh.categories.map((c) => (c.name === 'Pull' ? { ...c, name: 'Back' } : c)); // renamed
    const old = fresh.exercises.filter((e) => v1Names.includes(e.name));
    old.push({ ...old[0], id: 'mine', name: 'goblet squat' }); // user already added one of the new ones
    const upgraded = upgradeLibrary(categories, old, 1);
    const names = upgraded.map((e) => e.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('arnold press');
    expect(names).toContain('chin-ups'); // matched the renamed group by its emoji
    expect(names).not.toContain('dips'); // a v1 exercise the user deleted stays deleted
    expect(upgraded.find((e) => e.name === 'Chin-ups')!.categoryId).toBe(categories.find((c) => c.name === 'Back')!.id);
    expect(upgradeLibrary(categories, upgraded, LIBRARY_VERSION)).toBe(upgraded);
  });
});
