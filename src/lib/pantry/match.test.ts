import { describe, expect, it } from 'vitest';
import { computeProfile } from '../flavor/profile';
import type { ProfiledRecipe } from '../recipes/types';
import { findPantrySwap, matchPantry } from './match';

const recipe = (id: string, names: string[]): ProfiledRecipe => {
  const ingredients = names.map((name) => ({ name, measure: '' }));
  return { id, title: id, category: 'Test', area: 'Test', tags: [], steps: [], source: 'flavorcraft', ingredients, flavor: computeProfile(ingredients) };
};

describe('findPantrySwap', () => {
  it('stands in an ingredient from the same substitution family', () => {
    expect(findPantrySwap('Lime', ['Rice Vinegar', 'Butter'])).toEqual({ missing: 'Lime', use: 'Rice Vinegar', why: 'both add acidity' });
    expect(findPantrySwap('Soy Sauce', ['Fish Sauce', 'Honey'])?.use).toBe('Fish Sauce');
    expect(findPantrySwap('Olive Oil', ['Butter'])?.why).toBe('both are cooking fats');
  });

  it('never swaps things that only look alike on the flavor chart', () => {
    // Found by running against the real catalog: all of these were suggested by a profile-similarity rule.
    expect(findPantrySwap('Vanilla Extract', ['Garlic'])).toBeNull();
    expect(findPantrySwap('Parsley', ['Garlic'])).toBeNull();
    expect(findPantrySwap('Plain Chocolate', ['Butter'])).toBeNull();
    expect(findPantrySwap('Beef', ['Chicken'])).toBeNull();
    expect(findPantrySwap('Chicken Stock', ['Chicken'])).toBeNull();
    expect(findPantrySwap('Rice', ['Pasta'])).toBeNull();
  });
});

describe('matchPantry', () => {
  const recipes = [
    recipe('prawns', ['Prawns', 'Lime', 'Garlic', 'Salt', 'Fish Sauce']),
    recipe('pasta', ['Spaghetti', 'Garlic', 'Olive Oil', 'Parmesan', 'Chilli', 'Parsley']),
    recipe('cake', ['Flour', 'Sugar', 'Eggs', 'Butter', 'Vanilla', 'Milk', 'Chocolate']),
  ];

  it('ignores staples and ranks by fewest missing ingredients', () => {
    const results = matchPantry(recipes, ['Prawns', 'Garlic', 'Fish Sauce', 'Lime']);
    expect(results[0].recipe.id).toBe('prawns');
    expect(results[0].missing).toEqual([]); // salt is a staple
  });

  it('counts a pantry swap instead of a missing ingredient', () => {
    const [prawns] = matchPantry(recipes, ['Prawns', 'Garlic', 'Fish Sauce', 'Rice Vinegar']);
    expect(prawns.missing).toEqual([]);
    expect(prawns.swaps).toEqual([{ missing: 'Lime', use: 'rice vinegar', why: 'both add acidity' }]);
  });

  it('matches regardless of plurals and wording', () => {
    const [prawns] = matchPantry(recipes, ['prawn', 'garlic cloves', 'fish sauce', 'limes']);
    expect(prawns.missing).toEqual([]);
  });

  it('leaves out recipes you have nothing for, or are missing too much of', () => {
    const results = matchPantry(recipes, ['Garlic'], 3);
    expect(results.map((r) => r.recipe.id)).toEqual(['prawns']); // pasta is missing 4
    expect(matchPantry(recipes, [])).toEqual([]);
  });
});
