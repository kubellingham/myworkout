import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import confetti from 'canvas-confetti';
import { lastLogFor, useStore } from '../lib/store';
import type { ExerciseKind, ExerciseLog, IntervalConfig, PR, SetLog, Settings } from '../lib/types';
import { KIND_ICONS, KIND_LABELS } from '../lib/types';
import { formatClock, intervalTotalSeconds, uid } from '../lib/utils';
import { EFFORTS, summarizeLog } from '../lib/format';
import { defaultsForKind } from '../lib/seed';
import { navigate } from '../lib/router';
import { NumberField, Segmented, Sheet, Switch } from '../components/ui';
import { IntervalEditor } from '../components/IntervalEditor';
import { IntervalTimer } from '../components/IntervalTimer';
import { vibrate, winSound } from '../lib/feedback';
import { useRest } from '../lib/rest';
import { RestBar } from '../components/RestBar';
import { ExerciseProgressSheet } from '../components/ExerciseProgressSheet';
import { PR_LABELS, bestsFor, detectPRs, exerciseKey, formatMetric } from '../lib/records';

export function WorkoutScreen() {
  const active = useStore((s) => s.active);
  if (!active) return <NoWorkout />;
  return <ActiveWorkout />;
}

function NoWorkout() {
  const { history, repeatWorkout, addCustomToActive } = useStore(
    useShallow((s) => ({ history: s.history, repeatWorkout: s.repeatWorkout, addCustomToActive: s.addCustomToActive })),
  );
  const [adding, setAdding] = useState(false);
  const last = history[0];
  return (
    <div className="screen">
      <div className="empty">
        <div className="empty-emoji">🏋️</div>
        <h2>No workout in progress</h2>
        <p>Let the wheel decide, or build one yourself.</p>
        <button className="btn primary big" onClick={() => navigate('spin')}>
          🎡 Spin a workout
        </button>
        <button className="btn ghost" onClick={() => setAdding(true)}>
          + Start empty workout
        </button>
        {last && (
          <button className="btn ghost" onClick={() => repeatWorkout(last.id)}>
            ↻ Repeat last: {last.categoryEmoji} {last.categoryName}
          </button>
        )}
      </div>
      <AddExerciseSheet open={adding} onClose={() => setAdding(false)} onAddCustom={addCustomToActive} />
    </div>
  );
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function ActiveWorkout() {
  const { active, history, settings, discardWorkout, finishWorkout, addCustomToActive } = useStore(
    useShallow((s) => ({
      active: s.active!,
      history: s.history,
      settings: s.settings,
      discardWorkout: s.discardWorkout,
      finishWorkout: s.finishWorkout,
      addCustomToActive: s.addCustomToActive,
    })),
  );
  const now = useNow();
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const doneCount = active.exercises.filter((e) => e.done).length;
  const total = active.exercises.length;

  // Personal records, live: compare each exercise against every earlier workout.
  const livePRs = useMemo(() => {
    const map = new Map<string, PR[]>();
    for (const log of active.exercises) {
      const prs = detectPRs(log, bestsFor(history, exerciseKey(log)));
      if (prs.length) map.set(log.id, prs);
    }
    return map;
  }, [active.exercises, history]);

  const prCount = [...livePRs.values()].flat().filter((p) => p.kind !== 'volume').length;

  const seenPRs = useRef<Set<string> | null>(null);
  const [prToast, setPrToast] = useState<PR | null>(null);
  useEffect(() => {
    const found = [...livePRs.entries()].flatMap(([logId, prs]) =>
      prs.filter((p) => p.kind !== 'volume').map((p) => ({ id: `${logId}:${p.kind}:${p.value}`, p })),
    );
    // Don't celebrate records that already existed when the screen opened.
    if (seenPRs.current == null) {
      seenPRs.current = new Set(found.map((f) => f.id));
      return;
    }
    const fresh = found.filter((f) => !seenPRs.current!.has(f.id));
    fresh.forEach((f) => seenPRs.current!.add(f.id));
    if (fresh.length === 0) return;
    setPrToast(fresh[0].p);
    winSound();
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.25 },
      colors: ['#ffd23f', '#ffb020', '#ffffff'],
      disableForReducedMotion: true,
    });
  }, [livePRs]);

  // Separate from the effect above: typing in a set re-runs that one and must not cancel the hide timer.
  useEffect(() => {
    if (!prToast) return;
    const t = setTimeout(() => setPrToast(null), 3800);
    return () => clearTimeout(t);
  }, [prToast]);

  return (
    <div className="screen workout-screen">
      <header className="workout-head" style={{ '--c': active.categoryColor } as React.CSSProperties}>
        <div className="wh-emoji">{active.categoryEmoji}</div>
        <div className="wh-body">
          <h1>{active.categoryName} day</h1>
          <div className="wh-meta">
            ⏱ {formatClock((now - active.startedAt) / 1000)} · {doneCount}/{total} done
            {active.spun && <span className="badge">🎡 spun</span>}
          </div>
        </div>
      </header>
      <div className="progress-bar">
        <span style={{ width: `${total ? (doneCount / total) * 100 : 0}%`, background: active.categoryColor }} />
      </div>

      <div className="ex-list">
        {active.exercises.map((log, i) => (
          <ExerciseCard
            key={log.id}
            log={log}
            index={i}
            count={total}
            nextName={active.exercises.slice(i + 1).find((e) => !e.done)?.name}
            prs={livePRs.get(log.id) ?? []}
          />
        ))}
      </div>

      <button className="btn ghost wide" onClick={() => setAdding(true)}>
        + Add exercise
      </button>

      <div className="workout-dock">
        <RestBar />
        <div className="finish-bar">
          <button
            className="btn danger-ghost"
            onClick={() => {
              if (!window.confirm('Discard this workout? Nothing will be saved.')) return;
              useRest.getState().stop();
              discardWorkout();
            }}
          >
            Discard
          </button>
          <button className="btn primary" onClick={() => setFinishing(true)}>
            Finish workout ✓
          </button>
        </div>
      </div>

      {prToast && (
        <div className="pr-toast pop-in" role="status">
          <span className="pr-trophy">🏆</span>
          <span>
            <strong>New PR!</strong> {prToast.name}
            <br />
            {PR_LABELS[prToast.kind]}: {formatMetric(prToast.kind, prToast.value, settings)}{' '}
            <small>(was {formatMetric(prToast.kind, prToast.previous, settings)})</small>
          </span>
        </div>
      )}

      <AddExerciseSheet open={adding} onClose={() => setAdding(false)} onAddCustom={addCustomToActive} />
      <FinishSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        onSave={(effort, notes) => {
          useRest.getState().stop();
          finishWorkout(effort, notes);
          setFinishing(false);
          confetti({ particleCount: 140, spread: 90, origin: { y: 0.7 }, disableForReducedMotion: true });
          navigate('progress');
        }}
        summary={`${doneCount}/${total} exercises · ${formatClock((now - active.startedAt) / 1000)}${
          prCount ? ` · 🏆 ${prCount} new record${prCount === 1 ? '' : 's'}` : ''
        }`}
      />
    </div>
  );
}

function ExerciseCard({
  log,
  index,
  count,
  nextName,
  prs,
}: {
  log: ExerciseLog;
  index: number;
  count: number;
  nextName?: string;
  prs: PR[];
}) {
  const { update, remove, move, settings, history, exercises, updateExercise } = useStore(
    useShallow((s) => ({
      update: s.updateActiveExercise,
      remove: s.removeActiveExercise,
      move: s.moveActiveExercise,
      settings: s.settings,
      history: s.history,
      exercises: s.exercises,
      updateExercise: s.updateExercise,
    })),
  );
  const [open, setOpen] = useState(!log.done);
  const [menu, setMenu] = useState(false);
  const [editingInterval, setEditingInterval] = useState(false);
  const [timing, setTiming] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const startRest = useRest((s) => s.start);
  const patch = (p: Partial<ExerciseLog>) => update(log.id, p);
  const last = log.exerciseId ? lastLogFor(history, log.exerciseId) : null;
  const libraryExercise = log.exerciseId ? exercises.find((e) => e.id === log.exerciseId) : undefined;

  const onSetDone = (sets: SetLog[]) => {
    if (!settings.restTimer) return;
    const nextSet = sets.findIndex((s) => !s.done);
    if (nextSet === -1 && !nextName) return; // that was the last set of the workout
    const label = nextSet === -1 ? `Next: ${nextName}` : `Next: set ${nextSet + 1} of ${log.name}`;
    startRest(libraryExercise?.defaults.rest ?? settings.restSeconds, label);
  };

  const markDone = (done: boolean) => {
    patch({ done });
    if (done) {
      vibrate(30);
      setOpen(false);
    }
  };

  return (
    <article className={`ex-card${log.done ? ' is-done' : ''}`}>
      <div className="ex-head" onClick={() => setOpen((o) => !o)}>
        <button
          className={`check${log.done ? ' on' : ''}`}
          aria-label={log.done ? 'Mark not done' : 'Mark done'}
          onClick={(e) => {
            e.stopPropagation();
            markDone(!log.done);
          }}
        >
          ✓
        </button>
        <div className="ex-title">
          <div className="ex-name">
            {log.name}
            {prs.some((p) => p.kind !== 'volume') && <span className="pr-badge">🏆 PR</span>}
          </div>
          <div className="ex-sub">
            {KIND_ICONS[log.kind]} {open ? KIND_LABELS[log.kind] : summarizeLog(log, settings)}
          </div>
        </div>
        <button
          className="icon-btn"
          aria-label="More"
          onClick={(e) => {
            e.stopPropagation();
            setMenu(true);
          }}
        >
          ⋯
        </button>
      </div>

      {open && (
        <div className="ex-body">
          {log.kind === 'strength' && (
            <StrengthBody
              log={log}
              settings={settings}
              last={last}
              onChange={patch}
              onSetDone={onSetDone}
              onAllDone={() => markDone(true)}
            />
          )}
          {log.kind === 'cardio' && (
            <div className="cardio">
              <label>
                <span>Minutes</span>
                <NumberField value={log.minutes} decimal onChange={(v) => patch({ minutes: v })} placeholder="0" />
              </label>
              <label>
                <span>Distance ({settings.distanceUnit})</span>
                <NumberField value={log.distance} decimal onChange={(v) => patch({ distance: v })} placeholder="0" />
              </label>
              {last && last.kind === 'cardio' && <div className="last">Last time: {summarizeLog(last, settings)}</div>}
              {!log.done && (
                <button className="btn primary wide" onClick={() => markDone(true)}>
                  Mark done ✓
                </button>
              )}
            </div>
          )}
          {log.kind === 'interval' && log.interval && (
            <div className="interval-card">
              <div className="interval-steps">
                {log.interval.warmup > 0 && <span className="pill warm">Warm-up {formatClock(log.interval.warmup)}</span>}
                {log.interval.steps.map((s, i) => (
                  <span key={s.id} className={`pill step-c${i % 4}`}>
                    {s.label} {formatClock(s.seconds)}
                  </span>
                ))}
                <span className="pill rounds">× {log.interval.rounds}</span>
                {log.interval.cooldown > 0 && <span className="pill warm">Cool-down {formatClock(log.interval.cooldown)}</span>}
              </div>
              <div className="interval-meta">
                Total {formatClock(intervalTotalSeconds(log.interval))}
                {(log.roundsDone ?? 0) > 0 && ` · ${log.roundsDone}/${log.interval.rounds} rounds done`}
              </div>
              <div className="btn-row">
                <button className="btn ghost" onClick={() => setEditingInterval(true)}>
                  ✏️ Edit times
                </button>
                <button className="btn primary" onClick={() => setTiming(true)}>
                  ▶ Start timer
                </button>
              </div>
            </div>
          )}
          {log.kind === 'check' && !log.done && (
            <button className="btn primary wide" onClick={() => markDone(true)}>
              Mark done ✓
            </button>
          )}
        </div>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title={log.name}>
        <div className="menu-list">
          <button onClick={() => (setShowProgress(true), setMenu(false))}>📈 See progress</button>
          <button disabled={index === 0} onClick={() => (move(log.id, -1), setMenu(false))}>
            ↑ Move up
          </button>
          <button disabled={index === count - 1} onClick={() => (move(log.id, 1), setMenu(false))}>
            ↓ Move down
          </button>
          <div className="menu-label">Track as</div>
          <Segmented<ExerciseKind>
            value={log.kind}
            options={(['strength', 'cardio', 'interval', 'check'] as ExerciseKind[]).map((k) => ({
              value: k,
              label: KIND_ICONS[k],
            }))}
            onChange={(k) => {
              const d = libraryExercise?.kind === k ? libraryExercise.defaults : defaultsForKind(k);
              patch({
                kind: k,
                done: false,
                sets:
                  k === 'strength'
                    ? log.sets ?? Array.from({ length: d.sets ?? 3 }, () => ({ reps: d.reps ?? null, weight: d.weight ?? null, done: false }))
                    : log.sets,
                minutes: k === 'cardio' ? log.minutes ?? d.minutes ?? null : log.minutes,
                distance: k === 'cardio' ? log.distance ?? d.distance ?? null : log.distance,
                interval: k === 'interval' ? log.interval ?? d.interval : log.interval,
                roundsDone: log.roundsDone ?? 0,
              });
              setOpen(true);
            }}
          />
          <button className="danger" onClick={() => (remove(log.id), setMenu(false))}>
            🗑 Remove from workout
          </button>
        </div>
      </Sheet>

      {log.interval && (
        <IntervalSheet
          open={editingInterval}
          onClose={() => setEditingInterval(false)}
          initial={log.interval}
          canSaveDefault={!!libraryExercise}
          onSave={(cfg, asDefault) => {
            patch({ interval: cfg });
            if (asDefault && libraryExercise) {
              updateExercise(libraryExercise.id, {
                defaults: { ...libraryExercise.defaults, interval: cfg },
                kind: 'interval',
              });
            }
            setEditingInterval(false);
          }}
        />
      )}

      {showProgress && (
        <ExerciseProgressSheet exerciseKey={exerciseKey(log)} fallbackName={log.name} onClose={() => setShowProgress(false)} />
      )}

      {timing && log.interval && (
        <IntervalTimer
          title={log.name}
          config={log.interval}
          onClose={(rounds, finished) => {
            setTiming(false);
            patch({ roundsDone: Math.max(rounds, log.roundsDone ?? 0), done: finished || log.done });
            if (finished) setOpen(false);
          }}
        />
      )}
    </article>
  );
}

function StrengthBody({
  log,
  settings,
  last,
  onChange,
  onSetDone,
  onAllDone,
}: {
  log: ExerciseLog;
  settings: Settings;
  last: ExerciseLog | null;
  onChange: (p: Partial<ExerciseLog>) => void;
  onSetDone: (sets: SetLog[]) => void;
  onAllDone: () => void;
}) {
  const sets = log.sets ?? [];
  const setAt = (i: number, p: Partial<(typeof sets)[number]>) => {
    const next = sets.map((s, j) => (j === i ? { ...s, ...p } : s));
    onChange({ sets: next });
    return next;
  };
  return (
    <div className="strength">
      {last && last.kind === 'strength' && <div className="last">Last time: {summarizeLog(last, settings)}</div>}
      <div className="set-grid set-head">
        <span>Set</span>
        <span>Reps</span>
        <span>{settings.weightUnit}</span>
        <span />
      </div>
      {sets.map((s, i) => (
        <div key={i} className={`set-grid set-row${s.done ? ' done' : ''}`}>
          <span className="set-num">{i + 1}</span>
          <NumberField value={s.reps} onChange={(v) => setAt(i, { reps: v })} placeholder="–" ariaLabel={`Set ${i + 1} reps`} />
          <NumberField value={s.weight} decimal onChange={(v) => setAt(i, { weight: v })} placeholder="–" ariaLabel={`Set ${i + 1} weight`} />
          <button
            className={`check small${s.done ? ' on' : ''}`}
            aria-label={`Set ${i + 1} done`}
            onClick={() => {
              const next = setAt(i, { done: !s.done });
              if (!s.done) {
                vibrate(20);
                onSetDone(next);
              }
              if (next.length > 0 && next.every((x) => x.done)) onAllDone();
            }}
          >
            ✓
          </button>
        </div>
      ))}
      <div className="btn-row">
        <button
          className="btn ghost small"
          onClick={() => {
            const prev = sets[sets.length - 1];
            onChange({ sets: [...sets, { reps: prev?.reps ?? null, weight: prev?.weight ?? null, done: false }] });
          }}
        >
          + Add set
        </button>
        {sets.length > 0 && (
          <button className="btn ghost small" onClick={() => onChange({ sets: sets.slice(0, -1) })}>
            − Remove set
          </button>
        )}
      </div>
    </div>
  );
}

export function IntervalSheet({
  open,
  onClose,
  initial,
  onSave,
  canSaveDefault,
}: {
  open: boolean;
  onClose: () => void;
  initial: IntervalConfig;
  onSave: (cfg: IntervalConfig, asDefault: boolean) => void;
  canSaveDefault: boolean;
}) {
  const [cfg, setCfg] = useState(initial);
  const [asDefault, setAsDefault] = useState(true);
  useEffect(() => {
    if (open) setCfg(initial);
  }, [open, initial]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Interval times"
      footer={
        <>
          {canSaveDefault && (
            <label className="inline-switch">
              <Switch checked={asDefault} onChange={setAsDefault} label="Remember for next time" />
              <span>Remember for next time</span>
            </label>
          )}
          <button className="btn primary wide" onClick={() => onSave(cfg, asDefault)}>
            Save
          </button>
        </>
      }
    >
      <IntervalEditor value={cfg} onChange={setCfg} />
    </Sheet>
  );
}

function AddExerciseSheet({
  open,
  onClose,
  onAddCustom,
}: {
  open: boolean;
  onClose: () => void;
  onAddCustom: (log: Omit<ExerciseLog, 'id'>) => void;
}) {
  const { categories, exercises, addToActive } = useStore(
    useShallow((s) => ({ categories: s.categories, exercises: s.exercises, addToActive: s.addToActive })),
  );
  const [q, setQ] = useState('');
  const [customKind, setCustomKind] = useState<ExerciseKind>('strength');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const query = q.trim().toLowerCase();
  const add = (id: string) => {
    addToActive(id);
    onClose();
    navigate('workout');
  };
  const addCustom = () => {
    const d = defaultsForKind(customKind);
    onAddCustom({
      exerciseId: null,
      name: q.trim(),
      kind: customKind,
      done: false,
      sets:
        customKind === 'strength'
          ? Array.from({ length: d.sets ?? 3 }, () => ({ reps: d.reps ?? null, weight: null, done: false }))
          : undefined,
      minutes: customKind === 'cardio' ? d.minutes : undefined,
      interval: customKind === 'interval' && d.interval ? { ...d.interval, steps: d.interval.steps.map((s) => ({ ...s, id: uid() })) } : undefined,
      roundsDone: 0,
    });
    onClose();
    navigate('workout');
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <input
        className="text-input search"
        placeholder="Search or type a new exercise…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {query && !exercises.some((e) => e.name.toLowerCase() === query) && (
        <div className="custom-add">
          <Segmented<ExerciseKind>
            value={customKind}
            onChange={setCustomKind}
            options={(['strength', 'cardio', 'interval', 'check'] as ExerciseKind[]).map((k) => ({ value: k, label: KIND_ICONS[k] }))}
          />
          <button className="btn primary wide" onClick={addCustom}>
            + Add “{q.trim()}” ({KIND_LABELS[customKind]})
          </button>
        </div>
      )}
      {categories.map((c) => {
        const list = exercises.filter((e) => e.categoryId === c.id && (!query || e.name.toLowerCase().includes(query)));
        if (list.length === 0) return null;
        return (
          <div key={c.id} className="pick-group">
            <div className="section-title" style={{ color: c.color }}>
              {c.emoji} {c.name}
            </div>
            {list.map((e) => (
              <button key={e.id} className="pick-row" onClick={() => add(e.id)}>
                <span>
                  {KIND_ICONS[e.kind]} {e.name}
                </span>
                <span className="plus">+</span>
              </button>
            ))}
          </div>
        );
      })}
    </Sheet>
  );
}

function FinishSheet({
  open,
  onClose,
  onSave,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (effort: number | null, notes: string) => void;
  summary: string;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nice work! 🎉"
      footer={
        <button className="btn primary wide" onClick={() => onSave(effort, notes.trim())}>
          Save workout
        </button>
      }
    >
      <p className="muted">{summary}</p>
      <div className="section-title">How did it feel?</div>
      <div className="effort-row">
        {EFFORTS.map((e) => (
          <button key={e.value} className={`effort${effort === e.value ? ' on' : ''}`} onClick={() => setEffort(e.value)}>
            <span className="effort-emoji">{e.emoji}</span>
            <span>{e.label}</span>
          </button>
        ))}
      </div>
      <div className="section-title">Notes</div>
      <textarea
        className="text-input"
        rows={4}
        placeholder="Energy, pain, PRs, what to change next time…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </Sheet>
  );
}

