import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MIX, MIX_ID, useStore } from '../lib/store';
import { Wheel, type WheelHandle, type WheelItem } from '../components/Wheel';
import { Stepper } from '../components/ui';
import { summarizeExercise } from '../lib/format';
import { KIND_ICONS } from '../lib/types';
import { daysBetween } from '../lib/utils';
import { navigate } from '../lib/router';
import { WeeklyGoal } from '../components/WeeklyGoal';

export function SpinScreen() {
  const spinCategoryId = useStore((s) => s.spin.categoryId);
  const active = useStore((s) => s.active);
  return (
    <div className="screen spin-screen">
      {active && (
        <button className="banner" onClick={() => navigate('workout')}>
          <span>
            {active.categoryEmoji} <strong>{active.categoryName}</strong> workout in progress
          </span>
          <span className="banner-cta">Continue →</span>
        </button>
      )}
      {spinCategoryId ? <ExerciseStage categoryId={spinCategoryId} /> : <TypeStage />}
    </div>
  );
}

function TypeStage() {
  const { categories, exercises, history, settings, setSpinCategory } = useStore(
    useShallow((s) => ({
      categories: s.categories,
      exercises: s.exercises,
      history: s.history,
      settings: s.settings,
      setSpinCategory: s.setSpinCategory,
    })),
  );
  const wheel = useRef<WheelHandle>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelItem | null>(null);

  useEffect(() => {
    if (result) actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  const cats = categories.filter((c) => c.inWheel);
  const items: WheelItem[] = cats.map((c) => ({ id: c.id, label: c.name, color: c.color, emoji: c.emoji }));

  const empty = useMemo(
    () => new Set(cats.filter((c) => !exercises.some((e) => e.categoryId === c.id && e.inWheel)).map((c) => c.id)),
    [cats, exercises],
  );

  const last = history[0];
  const resting =
    settings.avoidRepeat &&
    last?.categoryId &&
    last.finishedAt &&
    daysBetween(last.finishedAt, Date.now()) <= 1 &&
    cats.some((c) => c.id === last.categoryId) &&
    cats.length - empty.size >= 3
      ? cats.find((c) => c.id === last.categoryId)
      : undefined;

  const disabledIds = [...empty, ...(resting ? [resting.id] : [])];
  const mixCount = exercises.filter((e) => e.inWheel && cats.some((c) => c.id === e.categoryId)).length;
  const canSpin = items.length - new Set(disabledIds).size > 0;

  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="empty-emoji">🎡</div>
        <h2>The wheel is empty</h2>
        <p>Add some workout types in the Library to start spinning.</p>
        <button className="btn primary" onClick={() => navigate('library')}>
          Open Library
        </button>
      </div>
    );
  }

  return (
    <>
      <WeeklyGoal />
      <header className="spin-head">
        <div className="eyebrow">Step 1 of 2</div>
        <h1>What are we training today?</h1>
      </header>

      <Wheel
        ref={wheel}
        items={items}
        disabledIds={disabledIds}
        onSpinStart={() => {
          setSpinning(true);
          setResult(null);
        }}
        onResult={(item) => {
          setSpinning(false);
          setResult(item);
        }}
      />

      <div className="spin-actions" aria-live="polite" ref={actionsRef}>
        {result ? (
          <div className="result-card pop-in" style={{ '--c': result.color } as React.CSSProperties}>
            <div className="result-emoji">{result.emoji}</div>
            <div className="result-title">{result.label} day!</div>
            <div className="result-sub">Now let's spin your exercises.</div>
            <div className="btn-row">
              <button className="btn ghost" onClick={() => wheel.current?.spin(1, 0.7)}>
                ↻ Spin again
              </button>
              <button className="btn primary" onClick={() => setSpinCategory(result.id)}>
                Pick exercises →
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="btn primary big" disabled={spinning || !canSpin} onClick={() => wheel.current?.spin(1, 0.7)}>
              {spinning ? 'Spinning…' : '🎡 Spin the wheel'}
            </button>
            <p className="hint">{spinning ? 'Fingers crossed 🤞' : 'Tap SPIN, or flick the wheel with your finger'}</p>
            <button className="btn ghost mix-btn" disabled={spinning || mixCount === 0} onClick={() => setSpinCategory(MIX_ID)}>
              🎲 Mix it up: spin from all {mixCount} exercises
            </button>
          </>
        )}
      </div>

      {resting && (
        <p className="note">
          💤 <strong>{resting.name}</strong> sits this one out — you trained it{' '}
          {daysBetween(last!.finishedAt!, Date.now()) === 0 ? 'earlier today' : 'yesterday'}.
        </p>
      )}

      <section className="pick-self">
        <div className="section-title">Or choose yourself</div>
        <div className="chip-row wrap">
          {cats.map((c) => (
            <button
              key={c.id}
              className="chip"
              style={{ '--c': c.color } as React.CSSProperties}
              disabled={spinning || empty.has(c.id)}
              onClick={() => setSpinCategory(c.id)}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function ExerciseStage({ categoryId }: { categoryId: string }) {
  const s = useStore(
    useShallow((st) => ({
      categories: st.categories,
      exercises: st.exercises,
      settings: st.settings,
      picks: st.spin.picks,
      active: st.active,
      addSpinPick: st.addSpinPick,
      replaceSpinPick: st.replaceSpinPick,
      removeSpinPick: st.removeSpinPick,
      resetSpin: st.resetSpin,
      startWorkout: st.startWorkout,
      updateSettings: st.updateSettings,
    })),
  );
  const wheel = useRef<WheelHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const [respinIndex, setRespinIndex] = useState<number | null>(null);
  const respinRef = useRef<number | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const isMix = categoryId === MIX_ID;
  const category = isMix ? { id: MIX_ID, ...MIX } : s.categories.find((c) => c.id === categoryId);
  const catById = new Map(s.categories.map((c) => [c.id, c]));
  // Mix: every exercise on the wheel, from every group that's on the wheel, kept together by group.
  const pool = isMix
    ? s.categories.filter((c) => c.inWheel).flatMap((c) => s.exercises.filter((e) => e.categoryId === c.id && e.inWheel))
    : s.exercises.filter((e) => e.categoryId === categoryId && e.inWheel);
  const picks = s.picks.filter((id) => pool.some((e) => e.id === id));
  const groupOf = (categoryIdOfExercise: string) => catById.get(categoryIdOfExercise);
  const target = s.settings.exercisesPerWorkout;

  const { resetSpin } = s;
  useEffect(() => {
    if (!category) resetSpin();
  }, [category, resetSpin]);
  if (!category) return null;

  const items: WheelItem[] = pool.map((e) => {
    const g = groupOf(e.categoryId);
    return isMix && g
      ? { id: e.id, label: e.name, color: g.color, emoji: g.emoji }
      : { id: e.id, label: e.name, color: category.color };
  });
  const groupCount = new Set(pool.map((e) => e.categoryId)).size;
  const left = pool.length - picks.length;
  const done = picks.length >= target || left === 0;

  const spinFor = (index: number | null) => {
    respinRef.current = index;
    setRespinIndex(index);
    wheel.current?.spin(1, 0.5);
  };

  const start = () => {
    if (s.active && !window.confirm(`Replace your ${s.active.categoryName} workout in progress?`)) return;
    s.startWorkout(isMix ? MIX_ID : category.id, picks, true);
    navigate('workout');
  };

  return (
    <>
      <header className="spin-head">
        <div className="eyebrow">Step 2 of 2</div>
        <h1>
          <span style={{ color: category.color }}>
            {category.emoji} {category.name}
          </span>{' '}
          day
        </h1>
        {isMix && (
          <p className="muted small">
            {pool.length} exercises from {groupCount} group{groupCount === 1 ? '' : 's'} on one wheel
          </p>
        )}
        <button className="link-btn" onClick={s.resetSpin} disabled={spinning}>
          ← Change type
        </button>
      </header>

      {pool.length === 0 ? (
        <div className="empty">
          <p>{isMix ? 'No exercises are switched on for spins.' : `No exercises for ${category.name} are on the wheel yet.`}</p>
          <button className="btn primary" onClick={() => navigate(isMix ? 'library' : `library/${category.id}`)}>
            Add exercises
          </button>
        </div>
      ) : (
        <>
          <div className="progress-dots" aria-label={`${picks.length} of ${target} exercises picked`}>
            {Array.from({ length: Math.max(target, picks.length) }, (_, i) => (
              <span key={i} className={i < picks.length ? 'on' : ''} style={{ '--c': category.color } as React.CSSProperties} />
            ))}
          </div>

          <Wheel
            ref={wheel}
            size="medium"
            readout
            items={items}
            disabledIds={picks}
            onSpinStart={() => {
              setSpinning(true);
              setFresh(null);
            }}
            onResult={(item) => {
              setSpinning(false);
              const slot = respinRef.current;
              if (slot != null) s.replaceSpinPick(slot, item.id);
              else s.addSpinPick(item.id);
              respinRef.current = null;
              setRespinIndex(null);
              setFresh(item.id);
            }}
          />

          <div className="spin-actions" aria-live="polite">
            {fresh && !spinning && (
              <div className="toast pop-in" style={{ '--c': items.find((it) => it.id === fresh)?.color ?? category.color } as React.CSSProperties}>
                🎉 {pool.find((e) => e.id === fresh)?.name}
              </div>
            )}
            {!done ? (
              <button className="btn primary big" disabled={spinning || left === 0} onClick={() => spinFor(null)}>
                {spinning ? 'Spinning…' : `🎡 Spin exercise ${picks.length + 1}`}
              </button>
            ) : (
              <button className="btn primary big go" disabled={spinning} onClick={start}>
                🚀 Start workout
              </button>
            )}
            <div className="btn-row">
              {done && left > 0 && (
                <button className="btn ghost small" disabled={spinning} onClick={() => spinFor(null)}>
                  + Spin one more
                </button>
              )}
              {!done && picks.length > 0 && (
                <button className="btn ghost small" disabled={spinning} onClick={start}>
                  Start with {picks.length}
                </button>
              )}
            </div>
          </div>

          {picks.length > 0 && (
            <section>
              <div className="section-title">Your plan</div>
              <ol className="plan">
                {picks.map((id, i) => {
                  const ex = pool.find((e) => e.id === id)!;
                  const slot = s.picks.indexOf(id);
                  const g = isMix ? groupOf(ex.categoryId) : undefined;
                  return (
                    <li
                      key={id}
                      className={`${fresh === id ? 'fresh' : ''}${respinIndex === slot && spinning ? ' respinning' : ''}`}
                      style={{ '--c': g?.color ?? category.color } as React.CSSProperties}
                    >
                      <span className="plan-num">{i + 1}</span>
                      <div className="plan-body">
                        <div className="plan-name">
                          {KIND_ICONS[ex.kind]} {ex.name}
                        </div>
                        <div className="plan-sub">
                          {g && `${g.emoji} ${g.name} · `}
                          {summarizeExercise(ex, s.settings)}
                        </div>
                      </div>
                      <button
                        className="icon-btn"
                        aria-label={`Re-spin ${ex.name}`}
                        title="Swap with a new spin"
                        disabled={spinning || left === 0}
                        onClick={() => spinFor(slot)}
                      >
                        ⟳
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Remove ${ex.name}`}
                        disabled={spinning}
                        onClick={() => s.removeSpinPick(slot)}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <div className="setting-line">
            <span>Exercises per workout</span>
            <Stepper value={target} min={1} max={12} onChange={(v) => s.updateSettings({ exercisesPerWorkout: v })} />
          </div>
        </>
      )}
    </>
  );
}
