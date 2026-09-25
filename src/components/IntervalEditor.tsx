import type { IntervalConfig } from '../lib/types';
import { formatClock, intervalTotalSeconds, uid } from '../lib/utils';
import { interval } from '../lib/seed';
import { DurationInput, Stepper, Switch } from './ui';

const PRESETS: { name: string; make: () => IntervalConfig }[] = [
  { name: 'Run 1 / Walk 2', make: () => interval([['Run', 60], ['Walk', 120]], 6, 180, 180) },
  { name: 'Tabata 20/10', make: () => interval([['Work', 20], ['Rest', 10]], 8) },
  { name: '30 / 30', make: () => interval([['Work', 30], ['Rest', 30]], 8) },
  { name: '40 / 20', make: () => interval([['Work', 40], ['Rest', 20]], 10) },
  { name: 'EMOM 10', make: () => interval([['Every minute', 60]], 10) },
];

export function IntervalEditor({ value, onChange }: { value: IntervalConfig; onChange: (v: IntervalConfig) => void }) {
  const set = (patch: Partial<IntervalConfig>) => onChange({ ...value, ...patch });
  const setStep = (id: string, patch: Partial<{ label: string; seconds: number }>) =>
    set({ steps: value.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  return (
    <div className="interval-editor">
      <div className="chip-row scroll-x">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className="chip" onClick={() => onChange(p.make())}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="ie-row">
        <div className="ie-label">
          <Switch checked={value.warmup > 0} onChange={(on) => set({ warmup: on ? 180 : 0 })} label="Warm-up" />
          <span>Warm-up</span>
        </div>
        {value.warmup > 0 && <DurationInput value={value.warmup} onChange={(s) => set({ warmup: s })} />}
      </div>

      <div className="ie-steps">
        <div className="ie-caption">Each round</div>
        {value.steps.map((step, i) => (
          <div key={step.id} className={`ie-step step-c${i % 4}`}>
            <span className="ie-dot" />
            <input
              className="text-input"
              value={step.label}
              aria-label={`Step ${i + 1} name`}
              onChange={(e) => setStep(step.id, { label: e.target.value })}
            />
            <DurationInput value={step.seconds} onChange={(s) => setStep(step.id, { seconds: s })} />
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove step"
              disabled={value.steps.length <= 1}
              onClick={() => set({ steps: value.steps.filter((s) => s.id !== step.id) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn ghost small"
          onClick={() => set({ steps: [...value.steps, { id: uid(), label: value.steps.length % 2 ? 'Work' : 'Rest', seconds: 60 }] })}
        >
          + Add step
        </button>
      </div>

      <div className="ie-row">
        <span>Rounds</span>
        <Stepper value={value.rounds} min={1} max={99} onChange={(r) => set({ rounds: r })} />
      </div>

      <div className="ie-row">
        <div className="ie-label">
          <Switch checked={value.cooldown > 0} onChange={(on) => set({ cooldown: on ? 180 : 0 })} label="Cool-down" />
          <span>Cool-down</span>
        </div>
        {value.cooldown > 0 && <DurationInput value={value.cooldown} onChange={(s) => set({ cooldown: s })} />}
      </div>

      <div className="ie-total">
        Total <strong>{formatClock(intervalTotalSeconds(value))}</strong>
      </div>
    </div>
  );
}
