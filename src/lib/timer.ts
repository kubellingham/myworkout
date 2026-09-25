import type { IntervalConfig } from './types';

export type PhaseKind = 'ready' | 'warmup' | 'step' | 'cooldown';

export interface Phase {
  kind: PhaseKind;
  label: string;
  seconds: number;
  start: number; // seconds from timer start
  round: number; // 1-based, 0 for non-round phases
  stepIndex: number; // -1 for non-step phases
}

export const READY_SECONDS = 5;

export function buildPhases(cfg: IntervalConfig, ready = READY_SECONDS): Phase[] {
  const phases: Phase[] = [];
  let t = 0;
  const push = (p: Omit<Phase, 'start'>) => {
    if (p.seconds <= 0) return;
    phases.push({ ...p, start: t });
    t += p.seconds;
  };
  push({ kind: 'ready', label: 'Get ready', seconds: ready, round: 0, stepIndex: -1 });
  push({ kind: 'warmup', label: 'Warm-up', seconds: cfg.warmup, round: 0, stepIndex: -1 });
  for (let r = 1; r <= cfg.rounds; r++) {
    cfg.steps.forEach((s, i) => push({ kind: 'step', label: s.label || `Step ${i + 1}`, seconds: s.seconds, round: r, stepIndex: i }));
  }
  push({ kind: 'cooldown', label: 'Cool-down', seconds: cfg.cooldown, round: 0, stepIndex: -1 });
  return phases;
}

export function totalOf(phases: Phase[]): number {
  const last = phases[phases.length - 1];
  return last ? last.start + last.seconds : 0;
}

/** Index of the phase running at `elapsed` seconds, or phases.length when finished. */
export function phaseIndexAt(phases: Phase[], elapsed: number): number {
  for (let i = 0; i < phases.length; i++) {
    if (elapsed < phases[i].start + phases[i].seconds) return i;
  }
  return phases.length;
}

/** Rounds whose every step has fully elapsed. */
export function roundsCompleted(phases: Phase[], elapsed: number, rounds: number): number {
  let done = 0;
  for (let r = 1; r <= rounds; r++) {
    const steps = phases.filter((p) => p.round === r);
    if (steps.length === 0) continue;
    const last = steps[steps.length - 1];
    if (elapsed >= last.start + last.seconds) done = r;
  }
  return done;
}
