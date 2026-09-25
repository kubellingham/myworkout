import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyEntry, Category, Exercise, ExerciseLog, Settings, Workout } from './types';
import { DEFAULT_SETTINGS, LIBRARY_VERSION, createSeed, upgradeLibrary } from './seed';
import { cloneInterval, startOfDay, uid } from './utils';
import { workoutPRs } from './records';

/** Spin "category" meaning every exercise that's on the wheel, whatever its group. */
export const MIX_ID = '__mix__';
export const MIX = { name: 'Mix', emoji: '🎲', color: '#c6f432' };

export interface SpinPlan {
  categoryId: string | null;
  picks: string[]; // exercise ids, in order picked
}

interface Data {
  categories: Category[];
  exercises: Exercise[];
  history: Workout[];
  active: Workout | null;
  settings: Settings;
  spin: SpinPlan;
  body: BodyEntry[]; // newest first
}

interface Actions {
  // library
  addCategory: (c: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addExercise: (e: Omit<Exercise, 'id'>) => string;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
  setExercisesInWheel: (ids: string[], inWheel: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  // spin
  setSpinCategory: (id: string | null) => void;
  addSpinPick: (exerciseId: string) => void;
  replaceSpinPick: (index: number, exerciseId: string) => void;
  removeSpinPick: (index: number) => void;
  resetSpin: () => void;
  // workout
  startWorkout: (categoryId: string | null, exerciseIds: string[], spun: boolean) => void;
  addToActive: (exerciseId: string) => void;
  addCustomToActive: (log: Omit<ExerciseLog, 'id'>) => void;
  updateActiveExercise: (logId: string, patch: Partial<ExerciseLog>) => void;
  removeActiveExercise: (logId: string) => void;
  moveActiveExercise: (logId: string, dir: -1 | 1) => void;
  finishWorkout: (effort: number | null, notes: string) => string | null;
  discardWorkout: () => void;
  repeatWorkout: (workoutId: string) => void;
  deleteWorkout: (id: string) => void;
  // body
  saveBodyEntry: (entry: Omit<BodyEntry, 'id'>, id?: string) => void;
  deleteBodyEntry: (id: string) => void;
  // data
  importData: (json: string) => void;
  resetAll: () => void;
}

export type Store = Data & Actions;

function initialData(): Data {
  const seed = createSeed();
  return {
    ...seed,
    history: [],
    active: null,
    settings: { ...DEFAULT_SETTINGS },
    spin: { categoryId: null, picks: [] },
    body: [],
  };
}

/** Most recent logged entry for an exercise, used to pre-fill sets/weights. */
export function lastLogFor(history: Workout[], exerciseId: string): ExerciseLog | null {
  for (const w of history) {
    const log = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (log) return log;
  }
  return null;
}

export function makeLog(ex: Exercise, history: Workout[]): ExerciseLog {
  const d = ex.defaults;
  const log: ExerciseLog = { id: uid(), exerciseId: ex.id, name: ex.name, kind: ex.kind, done: false };
  const last = lastLogFor(history, ex.id);
  switch (ex.kind) {
    case 'strength': {
      const lastSets = last?.kind === 'strength' ? last.sets?.filter((s) => s.reps != null || s.weight != null) : undefined;
      if (lastSets && lastSets.length > 0) {
        log.sets = lastSets.map((s) => ({ reps: s.reps, weight: s.weight, done: false }));
      } else {
        log.sets = Array.from({ length: d.sets ?? 3 }, () => ({
          reps: d.reps ?? null,
          weight: d.weight ?? null,
          done: false,
        }));
      }
      break;
    }
    case 'cardio':
      log.minutes = d.minutes ?? null;
      log.distance = d.distance ?? null;
      break;
    case 'interval':
      log.interval = d.interval ? cloneInterval(d.interval) : undefined;
      log.roundsDone = 0;
      break;
    case 'check':
      break;
  }
  return log;
}

function newWorkout(
  category: Pick<Category, 'name' | 'emoji' | 'color'> & { id: string | null } | undefined,
  exercises: ExerciseLog[],
  spun: boolean,
): Workout {
  return {
    id: uid(),
    startedAt: Date.now(),
    finishedAt: null,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? 'Custom',
    categoryEmoji: category?.emoji ?? '⚡',
    categoryColor: category?.color ?? '#8f9bff',
    exercises,
    effort: null,
    notes: '',
    spun,
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData(),

      addCategory: (c) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { ...c, id }] }));
        return id;
      },
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          exercises: s.exercises.filter((e) => e.categoryId !== id),
          spin: s.spin.categoryId === id ? { categoryId: null, picks: [] } : s.spin,
        })),
      addExercise: (e) => {
        const id = uid();
        set((s) => ({ exercises: [...s.exercises, { ...e, id }] }));
        return id;
      },
      updateExercise: (id, patch) =>
        set((s) => ({ exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteExercise: (id) =>
        set((s) => ({
          exercises: s.exercises.filter((e) => e.id !== id),
          spin: { ...s.spin, picks: s.spin.picks.filter((p) => p !== id) },
        })),
      setExercisesInWheel: (ids, inWheel) => {
        const pick = new Set(ids);
        set((s) => ({ exercises: s.exercises.map((e) => (pick.has(e.id) ? { ...e, inWheel } : e)) }));
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setSpinCategory: (id) => set({ spin: { categoryId: id, picks: [] } }),
      addSpinPick: (exerciseId) => set((s) => ({ spin: { ...s.spin, picks: [...s.spin.picks, exerciseId] } })),
      replaceSpinPick: (index, exerciseId) =>
        set((s) => ({ spin: { ...s.spin, picks: s.spin.picks.map((p, i) => (i === index ? exerciseId : p)) } })),
      removeSpinPick: (index) =>
        set((s) => ({ spin: { ...s.spin, picks: s.spin.picks.filter((_, i) => i !== index) } })),
      resetSpin: () => set({ spin: { categoryId: null, picks: [] } }),

      startWorkout: (categoryId, exerciseIds, spun) => {
        const { categories, exercises, history } = get();
        const category = categoryId === MIX_ID ? { ...MIX, id: null } : categories.find((c) => c.id === categoryId);
        const logs = exerciseIds
          .map((id) => exercises.find((e) => e.id === id))
          .filter((e): e is Exercise => !!e)
          .map((e) => makeLog(e, history));
        set({ active: newWorkout(category, logs, spun), spin: { categoryId: null, picks: [] } });
      },
      addToActive: (exerciseId) => {
        const { exercises, history, active } = get();
        const ex = exercises.find((e) => e.id === exerciseId);
        if (!ex) return;
        const log = makeLog(ex, history);
        if (active) set({ active: { ...active, exercises: [...active.exercises, log] } });
        else set({ active: newWorkout(undefined, [log], false) });
      },
      addCustomToActive: (log) => {
        const { active } = get();
        const full = { ...log, id: uid() };
        if (active) set({ active: { ...active, exercises: [...active.exercises, full] } });
        else set({ active: newWorkout(undefined, [full], false) });
      },
      updateActiveExercise: (logId, patch) =>
        set((s) =>
          s.active
            ? {
                active: {
                  ...s.active,
                  exercises: s.active.exercises.map((e) => (e.id === logId ? { ...e, ...patch } : e)),
                },
              }
            : {},
        ),
      removeActiveExercise: (logId) =>
        set((s) =>
          s.active ? { active: { ...s.active, exercises: s.active.exercises.filter((e) => e.id !== logId) } } : {},
        ),
      moveActiveExercise: (logId, dir) =>
        set((s) => {
          if (!s.active) return {};
          const list = [...s.active.exercises];
          const i = list.findIndex((e) => e.id === logId);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return {};
          [list[i], list[j]] = [list[j], list[i]];
          return { active: { ...s.active, exercises: list } };
        }),
      finishWorkout: (effort, notes) => {
        const { active } = get();
        if (!active) return null;
        const done: Workout = { ...active, finishedAt: Date.now(), effort, notes };
        done.prs = workoutPRs(done, get().history);
        set((s) => ({ history: [done, ...s.history], active: null }));
        return done.id;
      },
      discardWorkout: () => set({ active: null }),
      repeatWorkout: (workoutId) => {
        const { history, exercises, categories } = get();
        const w = history.find((h) => h.id === workoutId);
        if (!w) return;
        const logs = w.exercises.map((old) => {
          const ex = old.exerciseId ? exercises.find((e) => e.id === old.exerciseId) : undefined;
          if (ex) return makeLog(ex, history);
          return {
            ...old,
            id: uid(),
            done: false,
            roundsDone: 0,
            sets: old.sets?.map((s) => ({ ...s, done: false })),
            interval: old.interval ? cloneInterval(old.interval) : undefined,
          };
        });
        const category = categories.find((c) => c.id === w.categoryId);
        const fresh = newWorkout(category, logs, false);
        if (!category) {
          fresh.categoryName = w.categoryName;
          fresh.categoryEmoji = w.categoryEmoji;
          fresh.categoryColor = w.categoryColor;
        }
        set({ active: fresh });
      },
      deleteWorkout: (id) => set((s) => ({ history: s.history.filter((w) => w.id !== id) })),

      saveBodyEntry: (entry, id) =>
        set((s) => {
          // One weigh-in per day: editing or logging again on the same day replaces it.
          const day = startOfDay(entry.date);
          const rest = s.body.filter((b) => b.id !== id && startOfDay(b.date) !== day);
          const next = [...rest, { ...entry, id: id ?? uid() }].sort((a, b) => b.date - a.date);
          return { body: next };
        }),
      deleteBodyEntry: (id) => set((s) => ({ body: s.body.filter((b) => b.id !== id) })),

      importData: (json) => {
        const parsed = JSON.parse(json);
        const data = parsed?.state ?? parsed;
        if (!Array.isArray(data?.categories) || !Array.isArray(data?.exercises) || !Array.isArray(data?.history)) {
          throw new Error('This file does not look like a Spin & Sweat backup.');
        }
        set({
          categories: data.categories,
          exercises: upgradeLibrary(data.categories, data.exercises, data.libraryVersion ?? 1),
          history: data.history,
          active: data.active ?? null,
          settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
          spin: { categoryId: null, picks: [] },
          body: Array.isArray(data.body) ? data.body : [],
        });
      },
      resetAll: () => set(initialData()),
    }),
    {
      name: 'myworkout-v1',
      // v2: bigger built-in exercise library.
      version: LIBRARY_VERSION,
      migrate: (persisted, version) => {
        const p = persisted as Partial<Data>;
        if (p?.categories && p.exercises) p.exercises = upgradeLibrary(p.categories, p.exercises, version);
        return p as Data;
      },
      partialize: (s) => ({
        categories: s.categories,
        exercises: s.exercises,
        history: s.history,
        active: s.active,
        settings: s.settings,
        spin: s.spin,
        body: s.body,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export function exportData(): string {
  const { categories, exercises, history, active, settings, body } = useStore.getState();
  return JSON.stringify(
    {
      app: 'spin-and-sweat',
      version: 1,
      libraryVersion: LIBRARY_VERSION,
      exportedAt: new Date().toISOString(),
      categories,
      exercises,
      history,
      active,
      settings,
      body,
    },
    null,
    2,
  );
}
