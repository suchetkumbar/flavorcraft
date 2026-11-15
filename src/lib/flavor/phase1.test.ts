import { describe, expect, it } from 'vitest';
import { findBridges } from './bridges';
import { buildPairingIndex } from './pairings';
import { computeProfile } from './profile';
import { ingredientFromSlug, ingredientSlug, starRecipes } from './ingredientInfo';
import { formatQuantity, isSeasoning, parseQuantity, scaleMeasure } from '../recipes/scaling';
import type { ProfiledRecipe } from '../recipes/types';

const recipe = (id: string, names: string[]): ProfiledRecipe => {
  const ingredients = names.map((name) => ({ name, measure: '' }));
  return { id, title: id, category: 'T', area: 'T', tags: [], steps: [], source: 'flavorcraft', ingredients, flavor: computeProfile(ingredients) };
};

describe('findBridges', () => {
  const index = buildPairingIndex([
    recipe('1', ['Chocolate', 'Chilli', 'Cinnamon']),
    recipe('2', ['Chocolate', 'Cinnamon', 'Butter', 'Sugar']),
    recipe('3', ['Chilli', 'Cinnamon', 'Beef']),
    recipe('4', ['Chilli', 'Garlic', 'Beef']),
    recipe('5', ['Chocolate', 'Cream', 'Sugar']),
  ]);

  it('finds an ingredient cooked with both sides', () => {
    const result = findBridges(index, 'chocolate', 'chilli')!;
    expect(result.bridges[0].name).toBe('cinnamon');
    expect(result.bridges[0]).toMatchObject({ withA: 2, withB: 2 });
  });

  it('never suggests something that only suits one side, or a staple', () => {
    const names = findBridges(index, 'chocolate', 'chilli')!.bridges.map((b) => b.name);
    expect(names).not.toContain('cream'); // chocolate only
    expect(names).not.toContain('garlic'); // chilli only
    expect(names).not.toContain('sugar'); // staple
  });

  it('reports recipes that already use both', () => {
    expect(findBridges(index, 'chocolate', 'chilli')!.together).toEqual(['1']);
  });

  it('returns null for unknown or identical ingredients', () => {
    expect(findBridges(index, 'chocolate', 'saffron')).toBeNull();
    expect(findBridges(index, 'chilli', 'Chillies')).toBeNull();
  });
});

describe('ingredient pages', () => {
  it('finds dishes where the ingredient carries the strongest taste', () => {
    const recipes = [
      recipe('sour-salad', ['Lime', 'Cucumber', 'Mint']),
      recipe('curry', ['Chicken', 'Curry Paste', 'Coconut Milk', 'Lime']),
    ];
    expect(starRecipes(recipes, 'lime').map((r) => r.id)).toEqual(['sour-salad']);
  });

  it('round-trips ingredient slugs', () => {
    expect(ingredientSlug('Soy Sauce')).toBe('soy-sauce');
    expect(ingredientFromSlug('soy-sauce')).toBe('soy sauce');
  });
});

describe('scaling', () => {
  it.each([
    ['1/2 cup', 0.5, ' cup'],
    ['1 1/2 tbsp', 1.5, ' tbsp'],
    ['½ tsp', 0.5, ' tsp'],
    ['1½ cups', 1.5, ' cups'],
    ['200g', 200, 'g'],
    ['2.5 kg', 2.5, ' kg'],
  ])('parses %s', (measure, low, rest) => {
    expect(parseQuantity(measure)).toEqual({ low, high: undefined, rest });
  });

  it('parses ranges and rejects measures without a number', () => {
    expect(parseQuantity('2-3 cloves')).toEqual({ low: 2, high: 3, rest: ' cloves' });
    expect(parseQuantity('to taste')).toBeNull();
    expect(parseQuantity('handful')).toBeNull();
  });

  it('formats friendly fractions and round metric amounts', () => {
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(1.33)).toBe('1⅓');
    expect(formatQuantity(2.98)).toBe('3');
    expect(formatQuantity(412, 'g')).toBe('410');
    expect(formatQuantity(12.4)).toBe('12');
  });

  it('scales ingredients linearly', () => {
    expect(scaleMeasure('Chicken', '500g', 2)).toEqual({ text: '1000g', scaled: true, eased: false });
    expect(scaleMeasure('Eggs', '3', 0.5).text).toBe('1½');
    expect(scaleMeasure('Garlic', '2-3 cloves', 2).text).toBe('4–6 cloves');
  });

  it('eases seasonings when making more, but not when making less', () => {
    // 2 tsp × 2^0.75 ≈ 3.4 → "3⅓", not 4.
    expect(scaleMeasure('Salt', '2 tsp', 2)).toEqual({ text: '3⅓ tsp', scaled: true, eased: true });
    expect(scaleMeasure('Fish Sauce', '2 tbsp', 0.5)).toEqual({ text: '1 tbsp', scaled: true, eased: false });
    expect(isSeasoning('Ground Cumin')).toBe(true);
    expect(isSeasoning('Butter')).toBe(false);
  });

  it('rounds counted items to sensible amounts', () => {
    expect(scaleMeasure('Chilli', '2', 2).text).toBe('3'); // eased 3.36, but you can't buy a third of a chilli
    expect(scaleMeasure('Scotch Bonnet', '1', 2).text).toBe('1½');
    expect(scaleMeasure('Celery', '1 Stick', 0.5).text).toBe('½ Stick');
  });

  it('scales "juice of" and "zest of" amounts', () => {
    expect(scaleMeasure('Lime', 'juice of 1', 2).text).toBe('juice of 2');
    expect(scaleMeasure('Lemon', 'zest and juice of 2', 0.5).text).toBe('zest and juice of 1');
  });

  it('leaves measures without numbers alone', () => {
    expect(scaleMeasure('Salt', 'to taste', 2)).toEqual({ text: 'to taste', scaled: false, eased: false });
    expect(scaleMeasure('Butter', '50g', 1)).toEqual({ text: '50g', scaled: false, eased: false });
  });
});
