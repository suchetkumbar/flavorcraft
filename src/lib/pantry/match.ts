import { matchIngredient } from '../flavor/ingredients';
import { canonicalName } from '../flavor/pairings';
import type { ProfiledRecipe } from '../recipes/types';

/** Things nearly every kitchen has; they never count as "missing". */
export const STAPLES = new Set(['water', 'salt', 'pepper', 'black pepper', 'oil', 'vegetable oil', 'sugar', 'flour', 'plain flour', 'ice']);

export interface PantrySwap {
  /** The missing recipe ingredient, as written in the recipe. */
  missing: string;
  /** What you have that can stand in for it. */
  use: string;
  /** Why it works, e.g. "both add acidity". */
  why: string;
}

export interface PantryMatch {
  recipe: ProfiledRecipe;
  have: string[];
  missing: string[];
  swaps: PantrySwap[];
  /** Share of non-staple ingredients you have, counting swaps as half. */
  score: number;
}

/**
 * Substitution families: ingredients a cook would actually trade for one
 * another. Keys are flavor-table keys (see ../flavor/ingredients.ts).
 * Deliberately conservative: a similar taste profile alone isn't enough
 * (garlic and vanilla are both "aromatic"; chicken and beef are both umami).
 */
const FAMILIES: { why: string; keys: string[] }[] = [
  { why: 'both add acidity', keys: ['lemon', 'lemon juice', 'lime', 'vinegar', 'rice vinegar', 'red wine vinegar', 'balsamic vinegar'] },
  { why: 'both are cooking fats', keys: ['butter', 'olive oil', 'oil', 'ghee', 'lard'] },
  { why: 'both are creamy dairy', keys: ['cream', 'double cream', 'heavy cream', 'creme fraiche', 'sour cream', 'yogurt', 'yoghurt', 'mascarpone'] },
  { why: 'both are milks', keys: ['milk', 'coconut milk'] },
  { why: 'both sweeten', keys: ['sugar', 'brown sugar', 'honey', 'maple syrup', 'syrup', 'molasses', 'treacle'] },
  { why: 'both add chilli heat', keys: ['chilli', 'chili', 'chilli powder', 'chili powder', 'cayenne', 'red pepper flakes', 'hot sauce', 'tabasco', 'sriracha', 'jalapeno', 'scotch bonnet'] },
  { why: 'both are onions', keys: ['onion', 'red onion', 'shallot', 'challot', 'spring onion', 'scallion', 'leek'] },
  { why: 'both are soft herbs', keys: ['parsley', 'coriander', 'cilantro', 'basil', 'mint', 'dill', 'chives', 'tarragon'] },
  { why: 'both are woody herbs', keys: ['thyme', 'rosemary', 'oregano', 'sage', 'marjoram', 'bay'] },
  { why: 'both are stocks', keys: ['stock', 'chicken stock', 'beef stock', 'vegetable stock', 'fish stock', 'broth', 'chicken broth', 'beef broth', 'stock cube'] },
  { why: 'both are salty sauces', keys: ['soy sauce', 'fish sauce', 'oyster sauce', 'worcestershire', 'miso'] },
  { why: 'both are hard cheeses', keys: ['parmesan', 'parmigiano', 'pecorino', 'cheddar', 'gruyere'] },
  { why: 'both are tomato bases', keys: ['tomato', 'tomato puree', 'tomato paste', 'passata'] },
];

const FAMILY_BY_KEY = new Map(FAMILIES.flatMap((f) => f.keys.map((k) => [k, f] as const)));

/** Finds something in the pantry from the same substitution family. */
export const findPantrySwap = (missing: string, pantry: string[]): PantrySwap | null => {
  const target = matchIngredient(missing);
  const family = target && FAMILY_BY_KEY.get(target.key);
  if (!target || !family) return null;
  for (const item of pantry) {
    const key = matchIngredient(item)?.key;
    if (key && key !== target.key && FAMILY_BY_KEY.get(key) === family) {
      return { missing, use: item, why: family.why };
    }
  }
  return null;
};

/**
 * Ranks recipes by how much of each you can make from your pantry.
 * Recipes needing more than `maxMissing` uncovered ingredients are left out.
 */
export const matchPantry = (recipes: ProfiledRecipe[], pantryItems: string[], maxMissing = 3): PantryMatch[] => {
  const pantry = [...new Set(pantryItems.map(canonicalName).filter(Boolean))];
  const pantrySet = new Set(pantry);
  if (pantry.length === 0) return [];

  const results: PantryMatch[] = [];
  for (const recipe of recipes) {
    const have: string[] = [];
    const missing: string[] = [];
    const swaps: PantrySwap[] = [];
    const seen = new Set<string>();
    for (const line of recipe.ingredients) {
      const key = canonicalName(line.name);
      if (!key || seen.has(key) || STAPLES.has(key)) continue;
      seen.add(key);
      if (pantrySet.has(key)) {
        have.push(line.name);
        continue;
      }
      const swap = findPantrySwap(line.name, pantry);
      if (swap) swaps.push(swap);
      else missing.push(line.name);
    }
    const total = have.length + missing.length + swaps.length;
    if (total === 0 || have.length === 0 || missing.length > maxMissing) continue;
    results.push({ recipe, have, missing, swaps, score: (have.length + swaps.length * 0.5) / total });
  }
  return results.sort((a, b) => a.missing.length - b.missing.length || b.score - a.score || b.have.length - a.have.length);
};

/** Other ingredients in the same substitution family, and why they're interchangeable. */
export const substitutesFor = (name: string): { why: string; keys: string[] } | null => {
  const key = matchIngredient(name)?.key;
  const family = key ? FAMILY_BY_KEY.get(key) : undefined;
  return family ? { why: family.why, keys: family.keys.filter((k) => k !== key) } : null;
};
