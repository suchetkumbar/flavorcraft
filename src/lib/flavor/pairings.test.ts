import { describe, expect, it } from 'vitest';
import { buildPairingIndex, canonicalName, pairingsFor, popularIngredients } from './pairings';
import type { Recipe } from '../recipes/types';

const recipe = (id: string, names: string[]): Recipe => ({
  id,
  title: id,
  category: 'Test',
  area: 'Test',
  tags: [],
  steps: [],
  source: 'flavorcraft',
  ingredients: names.map((name) => ({ name, measure: '' })),
});

describe('canonicalName', () => {
  it('groups known ingredients under their flavor-table entry', () => {
    expect(canonicalName('Greek Yogurt')).toBe('yogurt');
    expect(canonicalName('Garlic Clove')).toBe('garlic');
    expect(canonicalName('Chicken Stock')).toBe('chicken stock');
  });

  it('folds simple plurals for unknown ingredients without mangling words', () => {
    expect(canonicalName('Shiitakes')).toBe('shiitake');
    expect(canonicalName('Couscous')).toBe('couscous');
    expect(canonicalName('Hummus')).toBe('hummus');
  });
});

describe('pairingsFor', () => {
  const index = buildPairingIndex([
    recipe('a', ['Lemon', 'Garlic', 'Salt', 'Parsley']),
    recipe('b', ['Lemon', 'Garlic', 'Olive Oil']),
    recipe('c', ['Lemon', 'Honey', 'Salt']),
    recipe('d', ['Garlic', 'Ginger', 'Soy Sauce']),
  ]);

  it('ranks partners by association and skips the ingredient itself and staples', () => {
    const pairs = pairingsFor(index, 'Lemon');
    const names = pairs.map((p) => p.name);
    expect(names).not.toContain('lemon');
    expect(names).not.toContain('salt');
    expect(names[0]).toBe('garlic');
    expect(pairs.find((p) => p.name === 'garlic')?.together).toBe(2);
  });

  it('tags each partner with its dominant taste', () => {
    const honey = pairingsFor(index, 'lemon').find((p) => p.name === 'honey');
    expect(honey?.taste).toBe(0); // sweet
  });

  it('returns nothing for an ingredient that is not in the catalog', () => {
    expect(pairingsFor(index, 'saffron')).toEqual([]);
  });

  it('lists popular ingredients most-used first, without staples', () => {
    const popular = popularIngredients(index, 3);
    expect(popular[0]).toBe('lemon');
    expect(popular).not.toContain('salt');
  });
});
