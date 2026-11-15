import { matchIngredient } from './ingredients';
import { canonicalName } from './pairings';
import { dominantIndex } from './tastes';
import type { ProfiledRecipe } from '../recipes/types';

/**
 * Recipes where this ingredient carries the dish: it's the main source of its
 * own signature taste (lime → sour), and that taste is one of the dish's two
 * strongest. So lime counts in a sour salad, not as a garnish on a curry.
 */
export const starRecipes = (recipes: ProfiledRecipe[], ingredient: string, limit = 6): ProfiledRecipe[] => {
  const key = canonicalName(ingredient);
  const own = matchIngredient(ingredient)?.vector;
  if (!own) return [];
  const taste = dominantIndex(own);
  if (taste < 0) return [];
  return recipes
    .filter((r) => {
      const v = r.flavor.vector;
      const rank = v.filter((x) => x > v[taste]).length; // 0 = strongest
      const lead = r.flavor.sources[taste][0];
      return rank <= 1 && v[taste] >= 4 && lead !== undefined && canonicalName(lead) === key;
    })
    .sort((a, b) => b.flavor.vector[taste] - a.flavor.vector[taste])
    .slice(0, limit);
};

/** URL-safe slug for an ingredient page, e.g. "soy sauce" → "soy-sauce". */
export const ingredientSlug = (name: string) => canonicalName(name).replace(/\s+/g, '-');
export const ingredientFromSlug = (slug: string) => decodeURIComponent(slug).replace(/-/g, ' ');

/** The flavor-table entry for an ingredient, if it has one. */
export const ingredientProfile = (name: string) => matchIngredient(name);
