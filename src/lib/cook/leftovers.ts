import { distance } from '../flavor/tastes';
import { canonicalName } from '../flavor/pairings';
import type { ProfiledRecipe } from '../recipes/types';

/**
 * Ingredients that come in packs bigger than one recipe needs and don't keep:
 * the half bunch of coriander, the rest of the cream. Canonical names
 * (see canonicalName in ../flavor/pairings.ts).
 */
const PERISHABLE = new Set([
  // soft herbs
  'parsley', 'coriander', 'cilantro', 'basil', 'mint', 'dill', 'chives', 'tarragon',
  // dairy and tins, once opened
  'cream', 'double cream', 'heavy cream', 'sour cream', 'creme fraiche', 'yogurt', 'yoghurt', 'buttermilk', 'mascarpone',
  'ricotta', 'feta', 'mozzarella', 'coconut milk', 'coconut cream', 'tomato puree', 'tomato paste', 'passata',
  // fresh produce bought in bunches or bags
  'spinach', 'celery', 'cabbage', 'leek', 'mushroom', 'spring onion', 'scallion', 'ginger', 'lemon', 'lime', 'chilli',
  'cucumber', 'courgette', 'zucchini', 'aubergine', 'eggplant', 'kale', 'broccoli', 'cauliflower', 'bean sprouts', 'fennel',
  'red pepper', 'green pepper', 'bell pepper', 'avocado', 'beetroot', 'carrot',
  // opened packs
  'bacon', 'pancetta', 'chorizo', 'ham', 'white wine', 'red wine', 'wine', 'bread', 'breadcrumbs', 'tortilla',
]);

/** Ground, dried and bottled forms keep for months; they aren't leftovers. */
const KEEPS = /\b(ground|dried|powder|flakes|seeds?|extract|essence|sauce|oil|vinegar|juice)\b/i;

/** The ingredients of a recipe you're likely to have some of left over. */
export const leftoverCandidates = (recipe: Pick<ProfiledRecipe, 'ingredients'>): string[] => {
  const out: string[] = [];
  for (const { name } of recipe.ingredients) {
    if (KEEPS.test(name)) continue;
    const key = canonicalName(name);
    if (PERISHABLE.has(key) && !out.includes(key)) out.push(key);
  }
  return out;
};

export interface LeftoverIdea {
  recipe: ProfiledRecipe;
  /** Which of your leftovers it uses. */
  uses: string[];
  /** 0–100: how different it tastes from the dish you just made. */
  change: number;
}

/**
 * Recipes that use up what's left, most leftovers first. Among equals, dishes
 * that taste different from what you just cooked rank higher, so tomorrow's
 * dinner isn't a repeat of tonight's.
 */
export const leftoverIdeas = (
  cooked: ProfiledRecipe,
  leftovers: string[],
  recipes: ProfiledRecipe[],
  limit = 8,
): LeftoverIdea[] => {
  const want = new Set(leftovers);
  if (want.size === 0) return [];
  const ideas: LeftoverIdea[] = [];
  for (const recipe of recipes) {
    if (recipe.id === cooked.id) continue;
    const uses: string[] = [];
    for (const { name } of recipe.ingredients) {
      if (KEEPS.test(name)) continue;
      const key = canonicalName(name);
      if (want.has(key) && !uses.includes(key)) uses.push(key);
    }
    if (uses.length === 0) continue;
    const change = Math.round(Math.min(1, distance(cooked.flavor.vector, recipe.flavor.vector) / 12) * 100);
    ideas.push({ recipe, uses, change });
  }
  return ideas.sort((x, y) => y.uses.length - x.uses.length || y.change - x.change).slice(0, limit);
};

/** "coriander and coconut milk" / "lime, mint and yogurt" */
export const listWords = (words: string[]): string =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
