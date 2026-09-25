import { useEffect, useRef, useState } from 'react';
import { useRest } from '../lib/rest';
import { useWakeLock } from '../lib/useWakeLock';
import { countdownBeep, phaseBeep } from '../lib/feedback';
import { formatClock } from '../lib/utils';

export function RestBar() {
  const { endsAt, total, label, add, stop } = useRest();
  const [now, setNow] = useState(Date.now());
  const [goUntil, setGoUntil] = useState<number | null>(null);
  const lastBeep = useRef<number | null>(null);

  const running = endsAt != null;
  useWakeLock(running);

  useEffect(() => {
    if (!running && goUntil == null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running, goUntil]);

  const left = running ? Math.ceil((endsAt - now) / 1000) : 0;

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      phaseBeep();
      stop();
      setGoUntil(Date.now() + 2500);
      lastBeep.current = null;
      return;
    }
    if (left <= 3 && lastBeep.current !== left) {
      lastBeep.current = left;
      countdownBeep();
    }
  }, [running, left, stop]);

  useEffect(() => {
    if (running || (goUntil != null && now >= goUntil)) setGoUntil(null);
  }, [running, goUntil, now]);

  if (goUntil != null && now < goUntil && !running) {
    return (
      <div className="rest-bar go pop-in" role="status">
        <strong>Go! 💪</strong>
        <span>{label}</span>
      </div>
    );
  }
  if (!running) return null;

  const frac = Math.max(0, Math.min(1, (endsAt - now) / (total * 1000)));
  return (
    <div className="rest-bar" role="timer" aria-label={`Rest, ${left} seconds left`}>
      <span className="rest-fill" style={{ transform: `scaleX(${frac})` }} />
      <div className="rest-info">
        <span className="rest-label">Rest</span>
        <strong className="rest-clock">{formatClock(left)}</strong>
        <span className="rest-next">{label}</span>
      </div>
      <button onClick={() => add(-15)} aria-label="15 seconds less">
        −15
      </button>
      <button onClick={() => add(15)} aria-label="15 seconds more">
        +15
      </button>
      <button className="skip" onClick={stop}>
        Skip
      </button>
    </div>
  );
}
