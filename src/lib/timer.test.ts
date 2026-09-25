import { describe, expect, it } from 'vitest';
import { buildPhases, phaseIndexAt, roundsCompleted, totalOf } from './timer';
import { interval } from './seed';
import { formatClock, intervalTotalSeconds, parseClock } from './utils';

describe('interval timer', () => {
  const cfg = interval([['Run', 60], ['Walk', 120]], 6, 180, 180);

  it('builds ready, warm-up, rounds and cool-down phases in order', () => {
    const phases = buildPhases(cfg);
    expect(phases.map((p) => p.label).slice(0, 5)).toEqual(['Get ready', 'Warm-up', 'Run', 'Walk', 'Run']);
    expect(phases).toHaveLength(1 + 1 + 12 + 1);
    expect(phases.at(-1)!.label).toBe('Cool-down');
    expect(totalOf(phases)).toBe(5 + intervalTotalSeconds(cfg));
    expect(intervalTotalSeconds(cfg)).toBe(180 + 6 * 180 + 180);
  });

  it('skips zero-length warm-up and cool-down', () => {
    const phases = buildPhases(interval([['Work', 20], ['Rest', 10]], 8));
    expect(phases[0].kind).toBe('ready');
    expect(phases[1].label).toBe('Work');
    expect(phases.at(-1)!.label).toBe('Rest');
  });

  it('finds the running phase and counts completed rounds', () => {
    const phases = buildPhases(cfg);
    const firstRun = 5 + 180;
    expect(phases[phaseIndexAt(phases, firstRun + 10)].label).toBe('Run');
    expect(phases[phaseIndexAt(phases, firstRun + 70)].label).toBe('Walk');
    expect(roundsCompleted(phases, firstRun + 179, 6)).toBe(0);
    expect(roundsCompleted(phases, firstRun + 180, 6)).toBe(1);
    expect(roundsCompleted(phases, totalOf(phases), 6)).toBe(6);
    expect(phaseIndexAt(phases, totalOf(phases))).toBe(phases.length);
  });
});

describe('clock helpers', () => {
  it('formats and parses', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(parseClock('1:30')).toBe(90);
    expect(parseClock('45')).toBe(45);
    expect(parseClock('x')).toBeNull();
  });
});
