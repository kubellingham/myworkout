import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { exportData, useStore } from '../lib/store';
import type { Category, Exercise, ExerciseKind } from '../lib/types';
import { KIND_ICONS, KIND_LABELS } from '../lib/types';
import { CATEGORY_COLORS, defaultsForKind } from '../lib/seed';
import { summarizeExercise } from '../lib/format';
import { navigate } from '../lib/router';
import { DurationInput, NumberField, Segmented, Sheet, Stepper, Switch } from '../components/ui';
import { IntervalEditor } from '../components/IntervalEditor';

export function LibraryScreen({ categoryId }: { categoryId?: string }) {
  const category = useStore((s) => s.categories.find((c) => c.id === categoryId));
  if (categoryId && category) return <CategoryPage category={category} />;
  return <LibraryHome />;
}

function LibraryHome() {
  const { categories, exercises, updateCategory } = useStore(
    useShallow((s) => ({ categories: s.categories, exercises: s.exercises, updateCategory: s.updateCategory })),
  );
  const [adding, setAdding] = useState(false);
  return (
    <div className="screen">
      <header className="page-head">
        <h1>Library</h1>
        <p className="muted">Everything on your wheels. Toggle items off to keep them out of spins.</p>
      </header>

      <div className="section-title">Workout types</div>
      <div className="list">
        {categories.map((c) => {
          const count = exercises.filter((e) => e.categoryId === c.id).length;
          const onWheel = exercises.filter((e) => e.categoryId === c.id && e.inWheel).length;
          return (
            <div key={c.id} className="list-row" onClick={() => navigate(`library/${c.id}`)} role="button" tabIndex={0}>
              <span className="swatch" style={{ background: c.color }}>
                {c.emoji}
              </span>
              <span className="lr-body">
                <span className="lr-title">{c.name}</span>
                <span className="lr-sub">
                  {count} exercises{onWheel !== count && ` · ${onWheel} on wheel`}
                </span>
              </span>
              <Switch checked={c.inWheel} onChange={(v) => updateCategory(c.id, { inWheel: v })} label={`${c.name} on wheel`} />
              <span className="chev">›</span>
            </div>
          );
        })}
      </div>
      <button className="btn ghost wide" onClick={() => setAdding(true)}>
        + Add workout type
      </button>

      <SettingsSection />

      <CategorySheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function CategoryPage({ category }: { category: Category }) {
  const { exercises, settings, updateExercise } = useStore(
    useShallow((s) => ({ exercises: s.exercises, settings: s.settings, updateExercise: s.updateExercise })),
  );
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const [editCat, setEditCat] = useState(false);
  const list = exercises.filter((e) => e.categoryId === category.id);
  return (
    <div className="screen">
      <button className="link-btn" onClick={() => navigate('library')}>
        ← Library
      </button>
      <header className="page-head cat-head" style={{ '--c': category.color } as React.CSSProperties}>
        <span className="swatch big" style={{ background: category.color }}>
          {category.emoji}
        </span>
        <div>
          <h1>{category.name}</h1>
          <button className="link-btn" onClick={() => setEditCat(true)}>
            Edit type
          </button>
        </div>
      </header>

      <div className="list">
        {list.map((e) => (
          <div key={e.id} className="list-row" onClick={() => setEditing(e)} role="button" tabIndex={0}>
            <span className="kind-icon">{KIND_ICONS[e.kind]}</span>
            <span className="lr-body">
              <span className="lr-title">{e.name}</span>
              <span className="lr-sub">{summarizeExercise(e, settings)}</span>
            </span>
            <Switch checked={e.inWheel} onChange={(v) => updateExercise(e.id, { inWheel: v })} label={`${e.name} on wheel`} />
          </div>
        ))}
        {list.length === 0 && <p className="muted pad">No exercises yet.</p>}
      </div>
      <button className="btn primary wide" onClick={() => setEditing('new')}>
        + Add exercise
      </button>

      <ExerciseSheet
        open={editing != null}
        exercise={editing === 'new' ? null : editing}
        categoryId={category.id}
        onClose={() => setEditing(null)}
      />
      <CategorySheet open={editCat} category={category} onClose={() => setEditCat(false)} />
    </div>
  );
}

const EMOJIS = ['💪', '🧗', '🦵', '🎯', '🏃', '🔥', '🧘', '🚴', '🏊', '🥊', '🤸', '⚡', '🏋️', '🦾', '🍑', '🫀'];

function CategorySheet({ open, onClose, category }: { open: boolean; onClose: () => void; category?: Category }) {
  const { addCategory, updateCategory, deleteCategory, categories } = useStore(
    useShallow((s) => ({
      addCategory: s.addCategory,
      updateCategory: s.updateCategory,
      deleteCategory: s.deleteCategory,
      categories: s.categories,
    })),
  );
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('⚡');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setEmoji(category?.emoji ?? EMOJIS[categories.length % EMOJIS.length]);
    setColor(category?.color ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]);
  }, [open, category, categories.length]);

  const save = () => {
    if (!name.trim()) return;
    if (category) updateCategory(category.id, { name: name.trim(), emoji, color });
    else {
      const id = addCategory({ name: name.trim(), emoji, color, inWheel: true });
      navigate(`library/${id}`);
    }
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? 'Edit workout type' : 'New workout type'}
      footer={
        <div className="btn-row">
          {category && (
            <button
              className="btn danger-ghost"
              onClick={() => {
                if (window.confirm(`Delete “${category.name}” and all its exercises? History is kept.`)) {
                  deleteCategory(category.id);
                  onClose();
                  navigate('library');
                }
              }}
            >
              Delete
            </button>
          )}
          <button className="btn primary" disabled={!name.trim()} onClick={save}>
            Save
          </button>
        </div>
      }
    >
      <label className="field">
        <span>Name</span>
        <input className="text-input" value={name} placeholder="e.g. Upper body" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="field">
        <span>Icon</span>
        <div className="emoji-grid">
          {EMOJIS.map((e) => (
            <button key={e} className={emoji === e ? 'on' : ''} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
          <input
            className="text-input emoji-input"
            aria-label="Custom emoji"
            value={EMOJIS.includes(emoji) ? '' : emoji}
            placeholder="✎"
            onChange={(e) => e.target.value && setEmoji([...e.target.value].slice(-2).join(''))}
          />
        </div>
      </div>
      <div className="field">
        <span>Colour</span>
        <div className="color-grid">
          {CATEGORY_COLORS.map((c) => (
            <button key={c} className={color === c ? 'on' : ''} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function ExerciseSheet({
  open,
  onClose,
  exercise,
  categoryId,
}: {
  open: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  categoryId: string;
}) {
  const { addExercise, updateExercise, deleteExercise, categories, settings } = useStore(
    useShallow((s) => ({
      addExercise: s.addExercise,
      updateExercise: s.updateExercise,
      deleteExercise: s.deleteExercise,
      categories: s.categories,
      settings: s.settings,
    })),
  );
  const [draft, setDraft] = useState<Omit<Exercise, 'id'>>({
    name: '',
    categoryId,
    kind: 'strength',
    inWheel: true,
    defaults: defaultsForKind('strength'),
  });
  useEffect(() => {
    if (!open) return;
    setDraft(
      exercise
        ? { ...exercise }
        : { name: '', categoryId, kind: 'strength', inWheel: true, defaults: defaultsForKind('strength') },
    );
  }, [open, exercise, categoryId]);

  const d = draft.defaults;
  const setD = (patch: Partial<typeof d>) => setDraft((x) => ({ ...x, defaults: { ...x.defaults, ...patch } }));

  const save = () => {
    if (!draft.name.trim()) return;
    const clean = { ...draft, name: draft.name.trim() };
    if (exercise) updateExercise(exercise.id, clean);
    else addExercise(clean);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exercise ? 'Edit exercise' : 'New exercise'}
      footer={
        <div className="btn-row">
          {exercise && (
            <button
              className="btn danger-ghost"
              onClick={() => {
                if (window.confirm(`Delete “${exercise.name}”? History is kept.`)) {
                  deleteExercise(exercise.id);
                  onClose();
                }
              }}
            >
              Delete
            </button>
          )}
          <button className="btn primary" disabled={!draft.name.trim()} onClick={save}>
            Save
          </button>
        </div>
      }
    >
      <label className="field">
        <span>Name</span>
        <input
          className="text-input"
          value={draft.name}
          placeholder="e.g. Goblet Squat"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Workout type</span>
        <select className="text-input" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <span>How to track it</span>
        <div className="kind-grid">
          {(['strength', 'cardio', 'interval', 'check'] as ExerciseKind[]).map((k) => (
            <button
              key={k}
              className={draft.kind === k ? 'on' : ''}
              onClick={() => setDraft((x) => ({ ...x, kind: k, defaults: { ...defaultsForKind(k), ...x.defaults } }))}
            >
              <span>{KIND_ICONS[k]}</span>
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {draft.kind === 'strength' && (
        <div className="defaults-grid">
          <label>
            <span>Sets</span>
            <Stepper value={d.sets ?? 3} min={1} max={20} onChange={(v) => setD({ sets: v })} />
          </label>
          <label>
            <span>Reps</span>
            <Stepper value={d.reps ?? 10} min={1} max={100} onChange={(v) => setD({ reps: v })} />
          </label>
          <label>
            <span>Weight ({settings.weightUnit})</span>
            <NumberField value={d.weight} decimal placeholder="optional" onChange={(v) => setD({ weight: v ?? undefined })} />
          </label>
          <label>
            <span>Rest between sets</span>
            <DurationInput value={d.rest ?? settings.restSeconds} onChange={(v) => setD({ rest: v })} />
          </label>
        </div>
      )}
      {draft.kind === 'cardio' && (
        <div className="defaults-grid">
          <label>
            <span>Minutes</span>
            <NumberField value={d.minutes} decimal placeholder="optional" onChange={(v) => setD({ minutes: v ?? undefined })} />
          </label>
          <label>
            <span>Distance ({settings.distanceUnit})</span>
            <NumberField value={d.distance} decimal placeholder="optional" onChange={(v) => setD({ distance: v ?? undefined })} />
          </label>
        </div>
      )}
      {draft.kind === 'interval' && d.interval && <IntervalEditor value={d.interval} onChange={(v) => setD({ interval: v })} />}

      <div className="field row">
        <span>Include in spins</span>
        <Switch checked={draft.inWheel} onChange={(v) => setDraft({ ...draft, inWheel: v })} label="Include in spins" />
      </div>
    </Sheet>
  );
}

function SettingsSection() {
  const { settings, updateSettings, importData, resetAll } = useStore(
    useShallow((s) => ({ settings: s.settings, updateSettings: s.updateSettings, importData: s.importData, resetAll: s.resetAll })),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = async () => {
    const json = exportData();
    const name = `spin-and-sweat-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    try {
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Spin & Sweat backup' });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const text = await f.text();
      if (!window.confirm('Replace everything in the app with this backup?')) return;
      importData(text);
      setMsg('✅ Backup restored');
    } catch (e) {
      setMsg(`⚠️ ${(e as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="settings">
      <div className="section-title">Settings</div>
      <div className="list">
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Exercises per workout</span>
          </span>
          <Stepper value={settings.exercisesPerWorkout} min={1} max={12} onChange={(v) => updateSettings({ exercisesPerWorkout: v })} />
        </div>
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Weekly goal</span>
            <span className="lr-sub">Workouts per week, shown as a ring on the Spin screen</span>
          </span>
          <Stepper value={settings.weeklyGoal} min={1} max={14} onChange={(v) => updateSettings({ weeklyGoal: v })} />
        </div>
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Rest timer</span>
            <span className="lr-sub">Starts when you tick a set</span>
          </span>
          <Switch checked={settings.restTimer} onChange={(v) => updateSettings({ restTimer: v })} label="Rest timer" />
        </div>
        {settings.restTimer && (
          <div className="list-row static">
            <span className="lr-body">
              <span className="lr-title">Default rest</span>
              <span className="lr-sub">Exercises can override this in their settings</span>
            </span>
            <DurationInput value={settings.restSeconds} onChange={(v) => updateSettings({ restSeconds: Math.max(5, v) })} />
          </div>
        )}
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Height (cm)</span>
            <span className="lr-sub">Used for BMI on the Body page</span>
          </span>
          <NumberField
            className="short"
            value={settings.heightCm}
            decimal
            placeholder="cm"
            onChange={(v) => updateSettings({ heightCm: v && v > 50 && v < 260 ? v : v == null ? null : settings.heightCm })}
          />
        </div>
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Rest yesterday's type</span>
            <span className="lr-sub">Grey it out on the wheel so you don't repeat it</span>
          </span>
          <Switch checked={settings.avoidRepeat} onChange={(v) => updateSettings({ avoidRepeat: v })} label="Rest yesterday's type" />
        </div>
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Sounds</span>
          </span>
          <Switch checked={settings.sound} onChange={(v) => updateSettings({ sound: v })} label="Sounds" />
        </div>
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Vibration</span>
            <span className="lr-sub">Android only — iPhones don't allow it in web apps</span>
          </span>
          <Switch checked={settings.vibration} onChange={(v) => updateSettings({ vibration: v })} label="Vibration" />
        </div>
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Weight</span>
          </span>
          <Segmented
            value={settings.weightUnit}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            onChange={(v) => updateSettings({ weightUnit: v })}
          />
        </div>
        <div className="list-row static">
          <span className="lr-body">
            <span className="lr-title">Distance</span>
          </span>
          <Segmented
            value={settings.distanceUnit}
            options={[
              { value: 'km', label: 'km' },
              { value: 'mi', label: 'mi' },
            ]}
            onChange={(v) => updateSettings({ distanceUnit: v })}
          />
        </div>
      </div>

      <div className="section-title">Backup</div>
      <p className="muted small">
        Your data lives only on this device. Export a backup now and then, and import it on a new phone.
      </p>
      <div className="btn-row">
        <button className="btn ghost" onClick={doExport}>
          ⬇ Export
        </button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>
          ⬆ Import
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
      </div>
      {msg && <p className="small">{msg}</p>}
      <button
        className="btn danger-ghost wide"
        onClick={() => {
          if (window.confirm('Reset everything? This deletes your history and custom exercises.')) resetAll();
        }}
      >
        Reset all data
      </button>
      <p className="muted small center">Spin & Sweat · v1.0</p>
    </section>
  );
}
