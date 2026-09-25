import { useStore } from './store';

let ctx: AudioContext | null = null;
let lastTick = 0;

function audio(): AudioContext | null {
  if (!useStore.getState().settings.sound) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from a user gesture so iOS lets us play sound later. */
export function unlockAudio(): void {
  const a = audio();
  if (!a) return;
  const buf = a.createBuffer(1, 1, 22050);
  const src = a.createBufferSource();
  src.buffer = buf;
  src.connect(a.destination);
  src.start(0);
}

function tone(freq: number, start: number, duration: number, volume = 0.2, type: OscillatorType = 'sine'): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function vibrate(pattern: number | number[]): void {
  if (!useStore.getState().settings.vibration) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not supported */
    }
  }
}

/** The click of the wheel's flapper hitting a peg. */
export function tick(): void {
  const now = performance.now();
  if (now - lastTick < 28) return;
  lastTick = now;
  tone(1700 + Math.random() * 300, 0, 0.035, 0.12, 'square');
  vibrate(4);
}

export function winSound(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, 0.18, 'triangle'));
  vibrate([30, 40, 60]);
}

export function countdownBeep(): void {
  tone(880, 0, 0.12, 0.25, 'sine');
  vibrate(40);
}

export function phaseBeep(): void {
  tone(1320, 0, 0.45, 0.3, 'sine');
  tone(1760, 0.08, 0.35, 0.18, 'sine');
  vibrate([120, 60, 120]);
}

export function doneFanfare(): void {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.4, 0.2, 'triangle'));
  vibrate([80, 60, 80, 60, 200]);
}
