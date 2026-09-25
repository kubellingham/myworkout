import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IntervalConfig } from '../lib/types';
import { buildPhases, phaseIndexAt, roundsCompleted, totalOf, type Phase } from '../lib/timer';
import { formatClock } from '../lib/utils';
import { countdownBeep, doneFanfare, phaseBeep, unlockAudio } from '../lib/feedback';
import { useWakeLock } from '../lib/useWakeLock';

const STEP_COLORS = ['#ff5a36', '#18b373', '#2f8cff', '#9b5cff'];

function phaseColor(p: Phase | undefined): string {
  if (!p) return '#18b373';
  if (p.kind === 'ready') return '#2a2e38';
  if (p.kind === 'warmup' || p.kind === 'cooldown') return '#4b43b8';
  return STEP_COLORS[p.stepIndex % STEP_COLORS.length];
}

export function IntervalTimer({
  title,
  config,
  onClose,
}: {
  title: string;
  config: IntervalConfig;
  onClose: (roundsDone: number, finished: boolean) => void;
}) {
  const phases = useMemo(() => buildPhases(config), [config]);
  const total = totalOf(phases);
  const accumRef = useRef(0); // ms elapsed before the current run
  const sinceRef = useRef<number | null>(Date.now());
  const [, force] = useState(0);
  const lastPhaseRef = useRef(0);
  const lastBeepRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const running = sinceRef.current != null;
  const elapsedMs = accumRef.current + (sinceRef.current != null ? Date.now() - sinceRef.current : 0);
  const elapsed = Math.min(total, elapsedMs / 1000);
  const idx = phaseIndexAt(phases, elapsed);
  const finished = idx >= phases.length;
  const phase = phases[Math.min(idx, phases.length - 1)];
  const remaining = finished ? 0 : phase.start + phase.seconds - elapsed;
  const next = phases[idx + 1];

  // Render loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      force((x) => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useWakeLock(true);

  // Sounds: 3-2-1 countdown and a chime on every phase change.
  useEffect(() => {
    if (finished) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        sinceRef.current = null;
        accumRef.current = total * 1000;
        doneFanfare();
      }
      return;
    }
    if (idx !== lastPhaseRef.current) {
      lastPhaseRef.current = idx;
      lastBeepRef.current = null;
      phaseBeep();
      return;
    }
    const secLeft = Math.ceil(remaining);
    if (running && secLeft <= 3 && secLeft >= 1 && lastBeepRef.current !== secLeft && phase.seconds > 3) {
      lastBeepRef.current = secLeft;
      countdownBeep();
    }
  });

  const setElapsed = (seconds: number) => {
    accumRef.current = Math.max(0, Math.min(total, seconds)) * 1000;
    if (sinceRef.current != null) sinceRef.current = Date.now();
    lastBeepRef.current = null;
    force((x) => x + 1);
  };

  const toggle = () => {
    unlockAudio();
    if (finished) return;
    if (sinceRef.current != null) {
      accumRef.current += Date.now() - sinceRef.current;
      sinceRef.current = null;
    } else {
      sinceRef.current = Date.now();
    }
    force((x) => x + 1);
  };

  const skip = () => {
    if (finished) return;
    setElapsed(phase.start + phase.seconds);
  };

  const back = () => {
    const into = elapsed - phase.start;
    if (finished) {
      finishedRef.current = false;
      const last = phases[phases.length - 1];
      lastPhaseRef.current = phases.length - 1;
      sinceRef.current = null;
      setElapsed(last.start);
      return;
    }
    if (into > 2 || idx === 0) setElapsed(phase.start);
    else {
      lastPhaseRef.current = idx - 1;
      setElapsed(phases[idx - 1].start);
    }
  };

  const close = () => {
    const rounds = roundsCompleted(phases, elapsed, config.rounds);
    if (!finished && elapsed > 1 && !window.confirm(`Stop the timer? ${rounds}/${config.rounds} rounds done.`)) return;
    onClose(rounds, finished);
  };

  const color = phaseColor(finished ? undefined : phase);
  const frac = finished ? 0 : remaining / phase.seconds;
  const circ = 2 * Math.PI * 46;
  const showRound = !finished && phase.kind === 'step';

  return createPortal(
    <div className={`timer${running ? '' : ' paused'}${finished ? ' done' : ''}`} style={{ background: color }}>
      <div className="timer-top">
        <button className="timer-x" onClick={close} aria-label="Close timer">
          ✕
        </button>
        <div className="timer-title">{title}</div>
        <div className="timer-total">{formatClock(total - elapsed)} left</div>
      </div>

      <div className="timer-main">
        <div className="timer-phase">{finished ? 'Done! 🎉' : phase.label}</div>
        {showRound && (
          <div className="timer-round">
            Round {phase.round} / {config.rounds}
          </div>
        )}
        <div className="timer-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" className="ring-bg" />
            <circle
              cx="50"
              cy="50"
              r="46"
              className="ring-fg"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - frac)}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="timer-clock">{finished ? formatClock(total) : formatClock(Math.ceil(remaining))}</div>
          {!running && !finished && <div className="timer-paused">PAUSED</div>}
        </div>
        <div className="timer-next">
          {finished ? (
            `${config.rounds} rounds complete`
          ) : next ? (
            <>
              Next: <strong>{next.label}</strong> {formatClock(next.seconds)}
            </>
          ) : (
            'Last one — finish strong!'
          )}
        </div>
      </div>

      <div className="timer-bar" aria-hidden>
        {phases.map((p, i) => (
          <span
            key={i}
            style={{
              flexGrow: p.seconds,
              background: i < idx ? 'rgba(255,255,255,.9)' : i === idx ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)',
            }}
          />
        ))}
      </div>

      <div className="timer-controls">
        <button onClick={back} aria-label="Back">
          ⏮
        </button>
        {finished ? (
          <button className="main" onClick={() => onClose(config.rounds, true)}>
            ✓
          </button>
        ) : (
          <button className="main" onClick={toggle} aria-label={running ? 'Pause' : 'Resume'}>
            {running ? '❚❚' : '▶'}
          </button>
        )}
        <button onClick={skip} disabled={finished} aria-label="Skip">
          ⏭
        </button>
      </div>
    </div>,
    document.body,
  );
}
