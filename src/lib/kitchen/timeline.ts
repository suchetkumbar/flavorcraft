import { TASTES, TASTE_KEYS, clampVector, emptyVector, type TasteVector } from '../flavor/tastes';
import { computeProfile } from '../flavor/profile';
import type { ProfiledRecipe } from '../recipes/types';
import type { KitchenData } from './types';

export interface TastePeriod {
  /** First day of the period. */
  start: Date;
  label: string;
  vector: TasteVector;
  /** Saves and cooks in this period. */
  count: number;
}

const quarterStart = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const fmtMonth = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });

/**
 * Your taste profile period by period (months, or quarters once you have more
 * than six months of history), from what you saved and cooked in each.
 * Periods with fewer than `minItems` entries are left out as too thin to read.
 */
export const tasteTimeline = (
  kitchen: KitchenData,
  recipesById: Map<string, ProfiledRecipe>,
  minItems = 2,
  now = new Date(),
): TastePeriod[] => {
  const events: { at: Date; vector: TasteVector }[] = [];
  for (const s of kitchen.saved) {
    const r = recipesById.get(s.recipeId);
    if (r) events.push({ at: new Date(s.savedAt), vector: r.flavor.vector });
  }
  const remixById = new Map(kitchen.remixes.map((r) => [r.id, r]));
  for (const c of kitchen.cooks) {
    const remix = c.remixId ? remixById.get(c.remixId) : undefined;
    const vector = remix ? computeProfile(remix.ingredients).vector : recipesById.get(c.recipeId)?.flavor.vector;
    if (vector) events.push({ at: new Date(c.cookedAt), vector });
  }
  if (events.length === 0) return [];

  const earliest = events.reduce((min, e) => (e.at < min ? e.at : min), now);
  const byQuarter = now.getTime() - earliest.getTime() > 183 * 24 * 60 * 60 * 1000;
  const startOf = byQuarter ? quarterStart : monthStart;

  const buckets = new Map<number, { start: Date; sum: TasteVector; count: number }>();
  for (const e of events) {
    const start = startOf(e.at);
    const b = buckets.get(start.getTime()) ?? { start, sum: emptyVector(), count: 0 };
    e.vector.forEach((x, i) => (b.sum[i] += x));
    b.count += 1;
    buckets.set(start.getTime(), b);
  }

  return [...buckets.values()]
    .filter((b) => b.count >= minItems)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((b) => ({
      start: b.start,
      label: byQuarter ? `Q${Math.floor(b.start.getMonth() / 3) + 1} ${b.start.getFullYear()}` : fmtMonth.format(b.start),
      vector: clampVector(b.sum.map((x) => Math.round((x / b.count) * 10) / 10)),
      count: b.count,
    }));
};

const MORE: Record<string, string> = { sweet: 'sweeter food', salty: 'saltier food', sour: 'sourer, brighter food', bitter: 'more bitter flavors', umami: 'more savory food', heat: 'more heat', rich: 'richer food', aroma: 'more aromatic food' };
const NOUN: Record<string, string> = { sweet: 'sweetness', salty: 'salt', sour: 'sourness', bitter: 'bitterness', umami: 'savory food', heat: 'heat', rich: 'richness', aroma: 'aromatics' };

/** One sentence on how your taste moved between the first and last period, or null if it barely moved. */
export const describeDrift = (periods: TastePeriod[], threshold = 1): string | null => {
  if (periods.length < 2) return null;
  const first = periods[0];
  const last = periods[periods.length - 1];
  const moves = TASTE_KEYS.map((key, i) => ({ key, d: last.vector[i] - first.vector[i] }))
    .filter((m) => Math.abs(m.d) >= threshold)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  if (!moves.length) return `Your taste has stayed steady since ${first.label}.`;
  const toward = moves.filter((m) => m.d > 0).slice(0, 2).map((m) => MORE[m.key]);
  const away = moves.filter((m) => m.d < 0).slice(0, 2).map((m) => NOUN[m.key]);
  const parts = [toward.length ? `toward ${toward.join(' and ')}` : '', away.length ? `away from ${away.join(' and ')}` : ''].filter(Boolean);
  return `Since ${first.label} you've moved ${parts.join(', and ')}.`;
};

export const tasteLabel = (i: number) => TASTES[i].label;
