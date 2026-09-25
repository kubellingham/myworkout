import type { BodyEntry, Settings } from './types';
import { startOfDay } from './utils';

const DAY = 86400000;
export const KG_PER_LB = 0.45359237;

export function toDisplayWeight(kg: number, unit: Settings['weightUnit']): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function fromDisplayWeight(value: number, unit: Settings['weightUnit']): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type Status = 'good' | 'warning' | 'serious' | 'critical';

/** WHO adult BMI bands. */
export const BMI_BANDS: { label: string; from: number; to: number; status: Status }[] = [
  { label: 'Underweight', from: 0, to: 18.5, status: 'warning' },
  { label: 'Healthy', from: 18.5, to: 25, status: 'good' },
  { label: 'Overweight', from: 25, to: 30, status: 'warning' },
  { label: 'Obese', from: 30, to: Infinity, status: 'serious' },
];

export function bmiBand(value: number) {
  return BMI_BANDS.find((b) => value >= b.from && value < b.to) ?? BMI_BANDS[BMI_BANDS.length - 1];
}

/** Waist-to-height ratio; under 0.5 is the common "keep your waist under half your height" guideline. */
export function waistToHeight(waistCm: number, heightCm: number): number {
  return waistCm / heightCm;
}

export function weighIns(entries: BodyEntry[]): { date: number; weight: number }[] {
  return entries
    .filter((e): e is BodyEntry & { weight: number } => e.weight != null)
    .map((e) => ({ date: e.date, weight: e.weight }))
    .sort((a, b) => a.date - b.date);
}

/** Trailing 7-day average at each weigh-in (oldest first). Smooths out day-to-day water swings. */
export function movingAverage(points: { date: number; weight: number }[], days = 7): { date: number; avg: number }[] {
  return points.map((p, i) => {
    const from = startOfDay(p.date) - (days - 1) * DAY;
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0 && startOfDay(points[j].date) >= from; j--) {
      sum += points[j].weight;
      n++;
    }
    return { date: p.date, avg: sum / n };
  });
}

/**
 * Change in the 7-day average over the last `days` days.
 * Falls back to "since first weigh-in" when there isn't that much history yet.
 */
export function trendChange(entries: BodyEntry[], days = 30): { change: number; since: number } | null {
  const avg = movingAverage(weighIns(entries));
  if (avg.length < 2) return null;
  const latest = avg[avg.length - 1];
  const cutoff = latest.date - days * DAY;
  let base = avg[0];
  for (const a of avg) if (a.date <= cutoff) base = a;
  if (base === latest) return null;
  return { change: latest.avg - base.avg, since: base.date };
}
