import { matchIngredient } from './ingredients';
import { BORING, canonicalName, type PairingIndex } from './pairings';

export interface Bridge {
  name: string;
  /** Recipes that use this ingredient with A, and with B. */
  withA: number;
  withB: number;
  /** 0–1: the weaker of its two associations, so it must pair well with both. */
  score: number;
  /** Index of its dominant taste, or -1 if it isn't in the flavor table. */
  taste: number;
}

export interface BridgeResult {
  a: string;
  b: string;
  /** Recipes that already use A and B together. */
  together: string[];
  bridges: Bridge[];
}

const dominantTaste = (name: string): number => {
  const v = matchIngredient(name)?.vector;
  if (!v) return -1;
  const i = v.reduce((best, x, j) => (x > v[best] ? j : best), 0);
  return v[i] > 2 ? i : -1;
};

/** Counts how often each other ingredient appears alongside `key`. */
const coCounts = (index: PairingIndex, key: string): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const id of index.byIngredient.get(key) ?? []) {
    const seen = new Set<string>();
    for (const line of index.recipes.get(id)?.ingredients ?? []) {
      const other = canonicalName(line.name);
      if (other === key || seen.has(other)) continue;
      seen.add(other);
      counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }
  return counts;
};

/**
 * Finds ingredients that connect A and B: each one is commonly cooked with
 * both, so it can carry a dish that uses the pair. Ranked by the weaker of the
 * two associations, which keeps out ingredients that only suit one side.
 */
export const findBridges = (index: PairingIndex, aName: string, bName: string, limit = 8): BridgeResult | null => {
  const a = canonicalName(aName);
  const b = canonicalName(bName);
  const aRecipes = index.byIngredient.get(a);
  const bRecipes = index.byIngredient.get(b);
  if (!aRecipes || !bRecipes || a === b) return null;

  const withA = coCounts(index, a);
  const withB = coCounts(index, b);
  // Ingredients in a big share of all recipes (egg, garlic, onion) "connect" everything, so they say nothing.
  // Only meaningful with a real catalog; tiny ones (tests, offline originals) skip it.
  const tooCommon = index.recipes.size >= 50 ? index.recipes.size * 0.12 : Infinity;
  // With enough data, one shared recipe is coincidence; ask for two on each side.
  const minShared = aRecipes.size >= 4 && bRecipes.size >= 4 ? 2 : 1;
  const bridges: Bridge[] = [];
  for (const [name, countA] of withA) {
    const countB = withB.get(name);
    if (!countB || name === b || BORING.has(name)) continue;
    if ((index.byIngredient.get(name)?.size ?? 0) > tooCommon) continue;
    if (countA < minShared || countB < minShared) continue;
    const size = index.byIngredient.get(name)?.size ?? 1;
    const strengthA = countA / Math.sqrt(aRecipes.size * size);
    const strengthB = countB / Math.sqrt(bRecipes.size * size);
    bridges.push({ name, withA: countA, withB: countB, score: Math.min(strengthA, strengthB), taste: dominantTaste(name) });
  }

  const together = [...aRecipes].filter((id) => bRecipes.has(id));
  return {
    a,
    b,
    together,
    bridges: bridges.sort((x, y) => y.score - x.score).slice(0, limit),
  };
};
