import { matchIngredient, normalizeIngredient } from './ingredients';
import type { Recipe } from '../recipes/types';

export interface Pairing {
  name: string;
  /** Number of recipes that use both ingredients. */
  together: number;
  /** 0–1 association strength, adjusted so salt and onion don't win every time. */
  strength: number;
  /** Index of the partner's dominant taste, or -1 if it isn't in the flavor table. */
  taste: number;
}

/**
 * Grouping name for an ingredient. Known ingredients collapse to their flavor
 * table entry ("Greek Yogurt" → "yogurt", "garlic clove" → "garlic"); others
 * are lowercased with simple plurals folded.
 */
export const canonicalName = (name: string): string => {
  const key = matchIngredient(name)?.key;
  if (key && !STEMS.has(key)) return key;
  const n = normalizeIngredient(name);
  if (n.endsWith('oes')) return n.slice(0, -2); // tomatoes → tomato
  if (n.endsWith('ies') && n.length > 4) return `${n.slice(0, -3)}y`; // berries → berry
  if (n.endsWith('s') && !/(ss|us)$/.test(n) && n.length > 3) return n.slice(0, -1);
  return n;
};

/** Table keys that are word stems rather than readable names. */
const STEMS = new Set(['berr', 'cherr', 'anchov', 'strawberr', 'raspberr', 'blueberr', 'blackberr', 'cranberr', 'challot', 'cardomom', 'hotsauce']);

export interface PairingIndex {
  /** ingredient → ids of recipes that use it */
  byIngredient: Map<string, Set<string>>;
  recipes: Map<string, Recipe>;
}

export const buildPairingIndex = (recipes: Recipe[]): PairingIndex => {
  const byIngredient = new Map<string, Set<string>>();
  const byId = new Map<string, Recipe>();
  for (const recipe of recipes) {
    byId.set(recipe.id, recipe);
    for (const line of recipe.ingredients) {
      const key = canonicalName(line.name);
      if (!key) continue;
      if (!byIngredient.has(key)) byIngredient.set(key, new Set());
      byIngredient.get(key)!.add(recipe.id);
    }
  }
  return { byIngredient, recipes: byId };
};

const dominantTaste = (name: string): number => {
  const match = matchIngredient(name);
  if (!match) return -1;
  let best = -1;
  let bestVal = 2; // ignore weak signals
  match.vector.forEach((v, i) => {
    if (v > bestVal) {
      best = i;
      bestVal = v;
    }
  });
  return best;
};

const BORING = new Set(['water', 'salt', 'pepper', 'black pepper', 'oil', 'vegetable oil', 'sugar', 'flour', 'plain flour']);

export const pairingsFor = (index: PairingIndex, ingredient: string, limit = 24): Pairing[] => {
  const key = canonicalName(ingredient);
  const own = index.byIngredient.get(key);
  if (!own) return [];
  const counts = new Map<string, number>();
  for (const id of own) {
    const recipe = index.recipes.get(id);
    if (!recipe) continue;
    const seen = new Set<string>();
    for (const line of recipe.ingredients) {
      const other = canonicalName(line.name);
      if (other === key || seen.has(other) || BORING.has(other)) continue;
      seen.add(other);
      counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }
  const results: Pairing[] = [];
  for (const [name, together] of counts) {
    const freq = index.byIngredient.get(name)?.size ?? together;
    // Cosine-style association: shared recipes relative to how common each is.
    const strength = together / Math.sqrt(own.size * freq);
    results.push({ name, together, strength, taste: dominantTaste(name) });
  }
  return results
    .filter((p) => p.together >= (own.size >= 6 ? 2 : 1))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit);
};

/** The most-used ingredients in the catalog, for suggestion chips. */
export const popularIngredients = (index: PairingIndex, limit = 40): string[] =>
  [...index.byIngredient.entries()]
    .filter(([name]) => !BORING.has(name) && matchIngredient(name))
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit)
    .map(([name]) => name);
