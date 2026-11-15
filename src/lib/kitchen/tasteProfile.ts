import { computeProfile } from '../flavor/profile';
import { PROBLEMS, type DishProblem } from '../flavor/fixes';
import { TASTE_KEYS, clampVector, distance, emptyVector, type TasteKey, type TasteVector } from '../flavor/tastes';
import type { ProfiledRecipe } from '../recipes/types';
import type { KitchenData } from './types';

export interface TasteProfile {
  vector: TasteVector;
  /** Number of saved recipes and cooks the profile is based on. */
  basedOn: number;
  /** Plain-language notes on how logged problems shifted the profile. */
  adjustments: string[];
}

/**
 * If you keep logging a problem, recommendations lean away from it.
 * Values are the shift applied per occurrence, capped below.
 */
const PROBLEM_SHIFT: Record<DishProblem, Partial<Record<TasteKey, number>>> = {
  'too-salty': { salty: -0.6 },
  'too-sweet': { sweet: -0.6 },
  'too-sour': { sour: -0.6 },
  'too-bitter': { bitter: -0.6 },
  'too-spicy': { heat: -0.6 },
  'too-heavy': { rich: -0.6 },
  flat: { sour: 0.3, salty: 0.3, aroma: 0.3 },
  'no-depth': { umami: 0.5 },
};
const MAX_SHIFT = 2;

/** Weight of a cook: rated dishes count more when you liked them. */
const cookWeight = (rating: number | null) => (rating === null ? 1.2 : 0.4 + rating * 0.4);

export const buildTasteProfile = (
  kitchen: KitchenData,
  recipesById: Map<string, ProfiledRecipe>,
): TasteProfile | null => {
  const sum = emptyVector();
  let weight = 0;
  let basedOn = 0;

  const add = (v: TasteVector, w: number) => {
    v.forEach((x, i) => (sum[i] += x * w));
    weight += w;
    basedOn += 1;
  };

  for (const s of kitchen.saved) {
    const recipe = recipesById.get(s.recipeId);
    if (recipe) add(recipe.flavor.vector, 1);
  }
  const remixById = new Map(kitchen.remixes.map((r) => [r.id, r]));
  for (const c of kitchen.cooks) {
    const remix = c.remixId ? remixById.get(c.remixId) : undefined;
    const vector = remix ? computeProfile(remix.ingredients).vector : recipesById.get(c.recipeId)?.flavor.vector;
    if (vector) add(vector, cookWeight(c.rating));
  }
  if (weight === 0) return null;

  const base = sum.map((x) => x / weight);

  // Shift away from problems you keep running into.
  const counts = new Map<DishProblem, number>();
  kitchen.cooks.flatMap((c) => c.problems).forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
  const shift = emptyVector();
  const adjustments: string[] = [];
  for (const [problem, n] of counts) {
    for (const [key, per] of Object.entries(PROBLEM_SHIFT[problem]) as [TasteKey, number][]) {
      const i = TASTE_KEYS.indexOf(key);
      shift[i] = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, shift[i] + per * n));
    }
    if (n >= 2) {
      const label = PROBLEMS.find((p) => p.id === problem)?.label.toLowerCase();
      adjustments.push(`You've noted “${label}” ${n} times, so suggestions adjust for it.`);
    }
  }

  return {
    vector: clampVector(base.map((x, i) => Math.round((x + shift[i]) * 10) / 10)),
    basedOn,
    adjustments,
  };
};

/** Recipes closest to your profile that you haven't saved or cooked. */
export const recommend = (
  profile: TasteVector,
  recipes: ProfiledRecipe[],
  exclude: Set<string>,
  limit = 4,
): ProfiledRecipe[] =>
  recipes
    .filter((r) => !exclude.has(r.id) && r.flavor.matched >= 3)
    .map((r) => ({ r, d: distance(r.flavor.vector, profile) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.r);

/** Mean profile across the catalog, used as the "typical recipe" baseline. */
export const catalogAverage = (recipes: ProfiledRecipe[]): TasteVector => {
  const usable = recipes.filter((r) => r.flavor.matched >= 3);
  const sum = emptyVector();
  usable.forEach((r) => r.flavor.vector.forEach((x, i) => (sum[i] += x)));
  return clampVector(sum.map((x) => (usable.length ? Math.round((x / usable.length) * 10) / 10 : 0)));
};

const MORE: Record<TasteKey, string> = {
  sweet: 'Sweeter', salty: 'Saltier', sour: 'More sour', bitter: 'More bitter',
  umami: 'More savory', heat: 'Hotter', rich: 'Richer', aroma: 'More aromatic',
};
const NOUN: Record<TasteKey, string> = {
  sweet: 'sweetness', salty: 'salt', sour: 'sourness', bitter: 'bitterness',
  umami: 'umami', heat: 'heat', rich: 'richness', aroma: 'aroma',
};

/** Plain-language differences between your profile and the typical recipe. */
export const standouts = (profile: TasteVector, average: TasteVector, threshold = 1.2): string[] =>
  TASTE_KEYS.map((key, i) => ({ key, d: profile[i] - average[i] }))
    .filter((x) => Math.abs(x.d) >= threshold)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 3)
    .map(({ key, d }) => (d > 0 ? `${MORE[key]} than most recipes` : `Lighter on ${NOUN[key]} than most recipes`));

/** Why a recipe was suggested: the tastes it shares most strongly with your profile. */
export const matchReason = (profile: TasteVector, recipe: TasteVector): string => {
  const shared = TASTE_KEYS.map((key, i) => ({ key, v: Math.min(profile[i], recipe[i]) }))
    .filter((x) => x.v >= 3.5)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map((x) => NOUN[x.key]);
  if (shared.length === 0) return 'Close to your overall balance';
  return `Matches your taste for ${shared.join(' and ')}`;
};
