import type { DishProblem } from '../flavor/fixes';
import { baseIngredient, setCrowdCorrections } from '../flavor/ingredients';
import { emptyVector, type TasteVector } from '../flavor/tastes';
import type { Recipe } from '../recipes/types';

/** One row from the `crowd_signals` database function: counts only, no people. */
export interface CrowdSignal {
  recipeId: string;
  /** Different people who cooked the unmodified recipe. */
  cooks: number;
  /** Null on the row that only carries the cook count. */
  problem: DishProblem | null;
  /** Of those cooks, how many reported the problem. */
  reports: number;
}

export interface CrowdCorrection {
  /** Flavor-table key, e.g. "soy sauce". */
  key: string;
  /** Index into TASTES. */
  taste: number;
  /** Added to the table score. Always positive: cooks only report "too much". */
  delta: number;
  /** Evidence behind it. */
  cooks: number;
  recipes: number;
}

/** "Too salty" says the dish has more salt than our numbers predicted, and so on. */
const PROBLEM_TASTE: Partial<Record<DishProblem, number>> = {
  'too-sweet': 0,
  'too-salty': 1,
  'too-sour': 2,
  'too-bitter': 3,
  'too-spicy': 5,
  'too-heavy': 6,
};

/** An ingredient needs this many cooks, across this many recipes, before it's touched. */
export const MIN_COOKS = 8;
export const MIN_RECIPES = 2;
/** Pretend every ingredient starts with this many cooks at the typical rate, so small samples move little. */
const PRIOR_COOKS = 5;
/** Share of cooks, above the typical rate, that has to complain before a score moves. */
const MIN_EXCESS = 0.15;
const GAIN = 5;
export const MAX_CORRECTION = 1.5;

/**
 * Works out which ingredient scores the crowd disagrees with.
 *
 * For each problem, an ingredient is compared with the typical recipe: if
 * dishes containing it are called "too salty" clearly more often than dishes
 * in general, its salt score goes up. Three things keep this honest:
 * - only ingredients that already carry the taste are blamed (onion is never
 *   made salty because it sits next to soy sauce);
 * - the typical complaint rate is subtracted, so a crowd that finds everything
 *   too salty changes nothing;
 * - small samples are pulled toward the typical rate, and the change is capped.
 */
export const tuneFromCrowd = (signals: CrowdSignal[], recipes: Recipe[]): CrowdCorrection[] => {
  const cooksBy = new Map<string, number>();
  const reportsBy = new Map<string, Map<number, number>>();
  for (const s of signals) {
    cooksBy.set(s.recipeId, Math.max(cooksBy.get(s.recipeId) ?? 0, s.cooks));
    const taste = s.problem ? PROBLEM_TASTE[s.problem] : undefined;
    if (taste === undefined) continue;
    const forRecipe = reportsBy.get(s.recipeId) ?? new Map<number, number>();
    forRecipe.set(taste, (forRecipe.get(taste) ?? 0) + s.reports);
    reportsBy.set(s.recipeId, forRecipe);
  }

  const cooked = recipes.filter((r) => cooksBy.has(r.id));
  const totalCooks = cooked.reduce((sum, r) => sum + cooksBy.get(r.id)!, 0);
  if (totalCooks === 0) return [];

  const out: CrowdCorrection[] = [];
  for (const taste of new Set(Object.values(PROBLEM_TASTE))) {
    const reports = (id: string) => reportsBy.get(id)?.get(taste) ?? 0;
    const typical = cooked.reduce((sum, r) => sum + reports(r.id), 0) / totalCooks;

    const evidence = new Map<string, { cooks: number; reports: number; recipes: number }>();
    for (const r of cooked) {
      const keys = new Set(
        r.ingredients
          .map((line) => baseIngredient(line.name))
          .filter((m) => m && m.vector[taste] > 0)
          .map((m) => m!.key),
      );
      for (const key of keys) {
        const e = evidence.get(key) ?? { cooks: 0, reports: 0, recipes: 0 };
        e.cooks += cooksBy.get(r.id)!;
        e.reports += reports(r.id);
        e.recipes += 1;
        evidence.set(key, e);
      }
    }

    for (const [key, e] of evidence) {
      if (e.cooks < MIN_COOKS || e.recipes < MIN_RECIPES) continue;
      const rate = (e.reports + typical * PRIOR_COOKS) / (e.cooks + PRIOR_COOKS);
      const excess = rate - typical;
      if (excess < MIN_EXCESS) continue;
      out.push({ key, taste, delta: Math.min(MAX_CORRECTION, Math.round(excess * GAIN * 10) / 10), cooks: e.cooks, recipes: e.recipes });
    }
  }
  return out.sort((a, b) => b.delta - a.delta || a.key.localeCompare(b.key));
};

let active: CrowdCorrection[] = [];

/** Puts corrections into effect for every profile computed from now on. */
export const applyCrowdCorrections = (corrections: CrowdCorrection[]) => {
  active = corrections;
  const byKey = new Map<string, TasteVector>();
  for (const c of corrections) {
    const vector = byKey.get(c.key) ?? emptyVector();
    vector[c.taste] = c.delta;
    byKey.set(c.key, vector);
  }
  setCrowdCorrections(byKey);
};

/** Corrections in effect for one ingredient, for showing where its numbers came from. */
export const correctionsFor = (key: string): CrowdCorrection[] => active.filter((c) => c.key === key);
export const activeCorrections = (): CrowdCorrection[] => active;

const CACHE_KEY = 'flavorcraft:crowd:v1';
const CACHE_HOURS = 24;

/**
 * Loads crowd signals with a day-long cache and a short timeout. Never throws:
 * the app must work the same when the server is slow, down or not configured.
 */
export const loadCrowdSignals = async (fetchSignals: () => Promise<CrowdSignal[]>, timeoutMs = 2500): Promise<CrowdSignal[]> => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { savedAt: number; signals: CrowdSignal[] } | null;
    if (cached && Date.now() - cached.savedAt < CACHE_HOURS * 3_600_000) return cached.signals;
  } catch {
    // Unreadable cache: fetch again.
  }
  try {
    const signals = await Promise.race([
      fetchSignals(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), signals }));
    } catch {
      // Storage full or unavailable.
    }
    return signals;
  } catch {
    return [];
  }
};
