import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { randomInt } from '../lib/utils';
import { tick, unlockAudio, winSound } from '../lib/feedback';

export interface WheelItem {
  id: string;
  label: string;
  color: string;
  emoji?: string;
}

export interface WheelHandle {
  spin: (direction?: 1 | -1, power?: number) => void;
}

interface Props {
  items: WheelItem[];
  disabledIds?: string[];
  onSpinStart?: () => void;
  onResult: (item: WheelItem) => void;
  hubLabel?: string;
  size?: 'large' | 'medium';
  /** Show the name under the pointer above the wheel, updating live while it spins. */
  readout?: boolean;
}

const R = 100; // wheel radius in SVG units
/** Above this many slices the labels can't be read, so only colours (and the readout) are shown. */
const LABEL_LIMIT = 40;
const MAX_BULBS = 24;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
}

function segmentPath(n: number, i: number): string {
  if (n === 1) return `M 0 ${-R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 ${-R} Z`;
  const seg = 360 / n;
  const [x1, y1] = polar(R, i * seg - seg / 2);
  const [x2, y2] = polar(R, i * seg + seg / 2);
  const large = seg > 180 ? 1 : 0;
  return `M 0 0 L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

function mix(hex: string, target: string, amount: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(target);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Pick a shade index so no two neighbours (including last/first) share a shade. */
function shadeIndex(i: number, n: number): number {
  if (n % 2 === 0) return i % 2;
  if (n % 3 === 1 && i === n - 1) return 1;
  return i % 3;
}

function fitLabel(label: string, maxLen: number, maxFont: number, minFont: number) {
  const charW = 0.56;
  let font = Math.min(maxFont, maxLen / (label.length * charW));
  let text = label;
  if (font < minFont) {
    font = minFont;
    const maxChars = Math.max(3, Math.floor(maxLen / (minFont * charW)));
    text = label.length > maxChars ? label.slice(0, maxChars - 1).trimEnd() + '…' : label;
  }
  return { text, font };
}

export const Wheel = forwardRef<WheelHandle, Props>(function Wheel(
  { items, disabledIds = [], onSpinStart, onResult, hubLabel = 'SPIN', size = 'large', readout = false },
  ref,
) {
  const n = items.length;
  const seg = 360 / Math.max(1, n);
  const rotRef = useRef(0);
  const rotorRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const winnerRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const dragRef = useRef<{ lastAngle: number; samples: { t: number; rot: number }[] } | null>(null);
  const kickRef = useRef(0);
  const pegRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);

  const disabled = useMemo(() => new Set(disabledIds), [disabledIds]);
  const available = useMemo(
    () => items.map((it, i) => (disabled.has(it.id) ? -1 : i)).filter((i) => i >= 0),
    [items, disabled],
  );

  // Clear the winner highlight when the set of items changes.
  const itemsKey = items.map((i) => i.id).join('|');
  useEffect(() => setWinner(null), [itemsKey]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  // Written straight to the DOM: it changes up to 60 times a second while spinning.
  const showReadout = useCallback(
    (peg: number) => {
      const el = readoutRef.current;
      if (!el || n === 0) return;
      const item = items[mod(peg, n)];
      el.textContent = `${item.emoji ? `${item.emoji} ` : ''}${item.label}`;
      el.style.setProperty('--c', item.color);
      // The winner is usually disabled right after it lands (it's been picked) — still show it as the win.
      el.classList.toggle('off', disabled.has(item.id) && winnerRef.current !== item.id);
    },
    [items, n, disabled],
  );

  useLayoutEffect(() => {
    showReadout(Math.floor((-rotRef.current + seg / 2) / seg));
  }, [showReadout, seg]);

  const apply = useCallback(
    (rot: number, dt = 16.7) => {
      rotRef.current = rot;
      if (rotorRef.current) rotorRef.current.style.transform = `rotate(${rot}deg)`;
      // Each time a peg passes the pointer: click + kick the flapper.
      const peg = Math.floor((-rot + seg / 2) / seg);
      if (peg !== pegRef.current) {
        pegRef.current = peg;
        kickRef.current = 1;
        tick();
        showReadout(peg);
      }
      kickRef.current *= Math.pow(0.8, dt / 16.7);
      if (pointerRef.current) {
        pointerRef.current.style.transform = `translateX(-50%) rotate(${-dirRef.current * kickRef.current * 24}deg)`;
      }
    },
    [seg, showReadout],
  );

  const spin = useCallback(
    (direction: 1 | -1 = 1, power = 0.6) => {
      if (spinning || available.length === 0) return;
      unlockAudio();
      const winIndex = available[randomInt(available.length)];
      const jitter = (Math.random() - 0.5) * seg * 0.7;
      // Wheel angle at which the winner's centre (+ jitter) sits under the pointer.
      const target = mod(-(winIndex * seg + jitter), 360);
      const start = rotRef.current;
      const turns = 5 + Math.round(power * 3) + randomInt(2);
      const delta = direction === 1 ? mod(target - start, 360) : -mod(start - target, 360);
      const end = start + direction * turns * 360 + delta;
      const overshoot = direction * Math.min(seg * 0.12, 3);
      const duration = 4600 + power * 1200 + Math.random() * 800;
      const settle = 420;

      dirRef.current = direction;
      winnerRef.current = null;
      readoutRef.current?.classList.remove('win');
      setSpinning(true);
      setWinner(null);
      onSpinStart?.();

      const t0 = performance.now();
      let last = t0;
      const frame = (now: number) => {
        const dt = now - last;
        last = now;
        const t = now - t0;
        let rot: number;
        if (t < duration) {
          rot = start + (end + overshoot - start) * easeOutQuart(t / duration);
        } else if (t < duration + settle) {
          rot = end + overshoot - overshoot * easeInOutSine((t - duration) / settle);
        } else {
          rot = end;
        }
        apply(rot, dt);
        if (t < duration + settle) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          rafRef.current = null;
          // Keep the number small so we never lose float precision.
          rotRef.current = mod(end, 360);
          if (rotorRef.current) rotorRef.current.style.transform = `rotate(${rotRef.current}deg)`;
          pegRef.current = Math.floor((-rotRef.current + seg / 2) / seg);
          if (pointerRef.current) pointerRef.current.style.transform = 'translateX(-50%) rotate(0deg)';
          const item = items[winIndex];
          winnerRef.current = item.id;
          showReadout(pegRef.current);
          readoutRef.current?.classList.add('win');
          setSpinning(false);
          setWinner(item.id);
          winSound();
          celebrate(wrapRef.current, item.color);
          onResult(item);
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    },
    [spinning, available, seg, items, apply, onSpinStart, onResult],
  );

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  // ---- drag / flick to spin ----
  const angleOf = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (spinning || available.length === 0) return;
    unlockAudio();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { lastAngle: angleOf(e), samples: [{ t: performance.now(), rot: rotRef.current }] };
    setWinner(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const a = angleOf(e);
    let delta = a - d.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.lastAngle = a;
    dirRef.current = delta >= 0 ? 1 : -1;
    apply(rotRef.current + delta);
    const now = performance.now();
    d.samples.push({ t: now, rot: rotRef.current });
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.samples.length < 2) return;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = last.t - first.t;
    if (dt <= 0 || performance.now() - last.t > 120) return;
    const v = (last.rot - first.rot) / dt; // deg per ms
    if (Math.abs(v) > 0.25) spin(v > 0 ? 1 : -1, Math.min(1, Math.abs(v) / 1.6));
  };

  const showLabels = n <= LABEL_LIMIT;
  const strokeWidth = n > 60 ? 0.3 : n > 24 ? 0.7 : 1.2;
  const bulbStep = Math.ceil(n / MAX_BULBS);
  const hasEmoji = items.some((i) => i.emoji);
  const labelOuter = hasEmoji ? 70 : 91;
  const labelInner = 30;

  return (
    <>
      {readout && <div className="wheel-readout" ref={readoutRef} aria-live="off" />}
      <div className={`wheel wheel-${size}${spinning ? ' is-spinning' : ''}${winner ? ' has-winner' : ''}`} ref={wrapRef}>
        <div className="wheel-pointer" ref={pointerRef} aria-hidden>
          <svg viewBox="0 0 40 52">
            <path d="M20 50 L4 12 A 17 17 0 1 1 36 12 Z" fill="#fff" stroke="#0f1115" strokeWidth="3" />
            <circle cx="20" cy="16" r="6" fill="#0f1115" />
          </svg>
        </div>
        <div
          className="wheel-rotor"
          ref={rotorRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label={`Wheel with ${n} options: ${items.map((i) => i.label).join(', ')}`}
        >
          <svg viewBox="-112 -112 224 224">
            <circle r="111" fill="#0b0c10" />
            <circle r="108" fill="url(#rim)" />
            <defs>
              <radialGradient id="rim" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#3a3f4d" />
                <stop offset="100%" stopColor="#1b1e26" />
              </radialGradient>
              <radialGradient id="shine" cx="50%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
                <stop offset="55%" stopColor="#fff" stopOpacity="0" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
              </radialGradient>
            </defs>
            {items.map((item, i) => {
              const shade = shadeIndex(i, n);
              // A just-picked winner keeps its colour until the next spin, even though it's now excluded.
              const isDisabled = disabled.has(item.id) && winner !== item.id;
              const base = item.color;
              const fill = isDisabled
                ? shade === 1
                  ? '#2c3039'
                  : '#353a45'
                : shade === 0
                  ? base
                  : shade === 1
                    ? mix(base, '#ffffff', 0.28)
                    : mix(base, '#000000', 0.18);
              const isWinner = winner === item.id;
              const maxFont = Math.min(15, ((2 * Math.PI * 58) / n) * 0.55);
              const { text, font } = fitLabel(item.label, labelOuter - labelInner, maxFont, 6.5);
              return (
                <g key={item.id} className={`seg${isWinner ? ' seg-win' : ''}${isDisabled ? ' seg-off' : ''}`}>
                  <path d={segmentPath(n, i)} fill={fill} stroke="#0f1115" strokeWidth={strokeWidth} />
                  {showLabels && (
                    <g transform={`rotate(${i * seg})`}>
                      {item.emoji && (
                        <text
                          x={0}
                          y={-84}
                          fontSize={Math.min(18, seg * 0.5)}
                          textAnchor="middle"
                          dominantBaseline="central"
                          opacity={isDisabled ? 0.4 : 1}
                        >
                          {item.emoji}
                        </text>
                      )}
                      <text
                        transform={`translate(0 ${-labelOuter}) rotate(90)`}
                        textAnchor="start"
                        dominantBaseline="central"
                        fontSize={font}
                        className="seg-label"
                        fill={isDisabled ? '#7b8190' : '#12141a'}
                        textDecoration={isDisabled ? 'line-through' : undefined}
                      >
                        {text}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            <circle r="100" fill="url(#shine)" pointerEvents="none" />
            {items.map((_, i) => {
              if (i % bulbStep !== 0) return null;
              const [x, y] = polar(104, i * seg + seg / 2);
              const odd = (i / bulbStep) % 2;
              return <circle key={i} className="bulb" cx={x} cy={y} r="2.6" style={{ animationDelay: `${odd * 0.18}s` }} />;
            })}
          </svg>
        </div>
        <div className="wheel-hub-ring" aria-hidden />
        <button
          type="button"
          className="wheel-hub"
          onClick={() => spin(1, 0.6)}
          disabled={spinning || available.length === 0}
          aria-label="Spin the wheel"
        >
          {hubLabel}
        </button>
      </div>
    </>
  );
});

function celebrate(el: HTMLElement | null, color: string) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const origin = {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height * 0.25) / window.innerHeight,
  };
  const colors = [color, '#ffffff', mix(color, '#ffffff', 0.5)];
  confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin, colors, scalar: 0.9, disableForReducedMotion: true });
  setTimeout(
    () => confetti({ particleCount: 50, spread: 110, startVelocity: 28, origin, colors, scalar: 0.8, disableForReducedMotion: true }),
    180,
  );
}
