import type { IntervalConfig } from './types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Uniform random integer in [0, max). Uses crypto when available. */
export function randomInt(max: number): number {
  if (max <= 1) return 0;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return (h > 0 ? `${h}:` : '') + `${mm}:${String(sec).padStart(2, '0')}`;
}

/** "1:30" -> 90, "45" -> 45, "2:00:00" -> 7200. Returns null when unparseable. */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length === 0 || parts.length > 3) return null;
  let total = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    total = total * 60 + Number(p);
  }
  return total;
}

export function intervalTotalSeconds(cfg: IntervalConfig): number {
  const round = cfg.steps.reduce((sum, s) => sum + s.seconds, 0);
  return cfg.warmup + round * cfg.rounds + cfg.cooldown;
}

export function describeInterval(cfg: IntervalConfig): string {
  const round = cfg.steps.map((s) => `${s.label} ${formatClock(s.seconds)}`).join(' / ');
  return `${round} × ${cfg.rounds}`;
}

export function cloneInterval(cfg: IntervalConfig): IntervalConfig {
  return { ...cfg, steps: cfg.steps.map((s) => ({ ...s, id: uid() })) };
}

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 of the week containing ts. */
export function weekStart(ts: number): number {
  const d = new Date(startOfDay(ts));
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

/** Same as weekStart but for the week `offset` weeks before (negative) or after. */
export function shiftWeek(weekStartTs: number, offset: number): number {
  const d = new Date(weekStartTs);
  d.setDate(d.getDate() + offset * 7);
  return d.getTime();
}

export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}

export function relativeDay(ts: number, now = Date.now()): string {
  const diff = daysBetween(ts, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return new Date(ts).toLocaleDateString(undefined, { weekday: 'long' });
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: new Date(ts).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
  });
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export function num(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}
