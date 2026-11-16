import { matchIngredient } from '../flavor/ingredients';
import { TASTES, TASTE_KEYS, type TasteKey } from '../flavor/tastes';
import type { DishProblem } from '../flavor/fixes';
import type { KitchenData } from './types';

/**
 * Your seasoning hand: how you tend to adjust recipes, learned from what you
 * log ("too salty") and how you remix (you keep adding lime). Each taste gets
 * a lean from -1 (you want less than recipes call for) to +1 (you want more).
 */
export interface SeasoningLean {
  taste: number;
  lean: number;
  /** How many log entries and remix edits point this way. */
  evidence: number;
}

const PROBLEM_LEAN: Record<DishProblem, Partial<Record<TasteKey, number>>> = {
  'too-salty': { salty: -1 },
  'too-sweet': { sweet: -1 },
  'too-sour': { sour: -1 },
  'too-bitter': { bitter: -1 },
  'too-spicy': { heat: -1 },
  'too-heavy': { rich: -1 },
  flat: { salty: 0.5, sour: 0.5 },
  'no-depth': { umami: 1 },
};

/** Each signal moves a taste this far; it takes several to reach a strong lean. */
const STEP = 0.25;
/** Below this much evidence, a lean is noise and isn't shown. */
export const MIN_EVIDENCE = 2;

const strongest = (name: string): number => {
  const v = matchIngredient(name)?.vector;
  if (!v) return -1;
  const i = v.reduce((best, x, j) => (x > v[best] ? j : best), 0);
  // Only clear seasonings count: an onion in a remix says little about your hand.
  return v[i] >= 6 ? i : -1;
};

export const seasoningHand = (kitchen: Pick<KitchenData, 'cooks' | 'remixes'>): SeasoningLean[] => {
  const lean = TASTE_KEYS.map(() => 0);
  const evidence = TASTE_KEYS.map(() => 0);

  for (const cook of kitchen.cooks) {
    for (const problem of cook.problems) {
      for (const [key, dir] of Object.entries(PROBLEM_LEAN[problem]) as [TasteKey, number][]) {
        const i = TASTE_KEYS.indexOf(key);
        lean[i] += dir * STEP;
        evidence[i] += 1;
      }
    }
  }
  for (const remix of kitchen.remixes) {
    for (const name of remix.added) {
      const i = strongest(name);
      if (i >= 0) {
        lean[i] += STEP;
        evidence[i] += 1;
      }
    }
    for (const name of remix.removed) {
      const i = strongest(name);
      if (i >= 0) {
        lean[i] -= STEP;
        evidence[i] += 1;
      }
    }
  }

  return lean
    .map((l, taste) => ({ taste, lean: Math.max(-1, Math.min(1, Math.round(l * 100) / 100)), evidence: evidence[taste] }))
    .filter((x) => x.evidence >= MIN_EVIDENCE && Math.abs(x.lean) >= 0.25)
    .sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean));
};

const MORE: Record<TasteKey, string> = {
  sweet: 'more sweetness', salty: 'more salt', sour: 'more acid', bitter: 'more bitterness',
  umami: 'more savory depth', heat: 'more heat', rich: 'more richness', aroma: 'more herbs and spice',
};
const LESS: Record<TasteKey, string> = {
  sweet: 'less sugar', salty: 'less salt', sour: 'less acid', bitter: 'less bitterness',
  umami: 'less savory punch', heat: 'less heat', rich: 'less fat', aroma: 'fewer herbs and spices',
};

export const describeLean = (l: SeasoningLean) => {
  const key = TASTES[l.taste].key;
  return `You usually want ${l.lean > 0 ? MORE[key] : LESS[key]} than recipes call for`;
};

/** How much to adjust an ingredient's amount for your hand: 1 = as written. */
export const amountFactorFor = (name: string, leans: SeasoningLean[]): number => {
  const i = strongest(name);
  const l = leans.find((x) => x.taste === i);
  if (!l) return 1;
  // At most ±30%; a full lean of 1 means about a third more or less.
  return Math.round((1 + 0.3 * l.lean) * 100) / 100;
};
